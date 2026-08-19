'use strict';
const crypto = require('crypto');
const cfg = require('./config');
const Game = require('./gameLoop');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karistirilabilir harfler (I,O,0,1) yok

class Player {
  constructor(conn, name, slot) {
    this.conn = conn;
    this.name = (name || '').toString().trim().slice(0, 10).toUpperCase() || 'OYUNCU';
    this.slot = slot;          // 0..MAX_PLAYERS-1  -> renk ve konum bu slota gore
    this.id = 'p' + slot;
    this.char = slot % cfg.CHAR_COUNT;   // baslangicta herkes farkli karakter
    this.ready = false;
    this.wins = 0;
    this.connected = true;

    // Baglanti kopup geri gelince "ben o oyuncuyum" diyebilmek icin gizli anahtar.
    // Sadece sahibine yollanir; baskasi bilirse onun yerine gecebilirdi.
    this.token = crypto.randomBytes(9).toString('hex');
    this.offAt = 0;            // ne zaman koptu (0 = bagli)
  }
  toJSON() {
    return {
      id: this.id, name: this.name, slot: this.slot, char: this.char,
      ready: this.ready, wins: this.wins,
      ping: this.conn ? this.conn.rtt || 0 : 0,
      on: this.connected,      // false = kopuk, ekranda "BAGLANIYOR" gorunur
    };
  }
}

class Room {
  constructor(code) {
    this.code = code;
    this.players = [];         // hicbir yerde "oyuncu1/oyuncu2" sabiti yok - hep bu liste
    this.winsNeeded = cfg.WINS_NEEDED;   // odayi kuran lobide degistirebilir
    this.acik = false;                   // true = HIZLI OYNA havuzunda, yabancilar eslesebilir
    this.game = new Game(this);
    this.dead = false;
  }

  // Oda kurucusu = en dusuk slottaki oyuncu. Ayrilirsa sonraki oyuncu devralir.
  get hostId() {
    return this.players.length ? this.players[0].id : null;
  }

  get isFull() { return this.players.length >= cfg.MAX_PLAYERS; }
  get isEmpty() { return this.players.length === 0; }

  freeSlot() {
    for (let s = 0; s < cfg.MAX_PLAYERS; s++) {
      if (!this.players.some((p) => p.slot === s)) return s;
    }
    return -1;
  }

  add(conn, name) {
    const slot = this.freeSlot();
    if (slot < 0) return null;
    const player = new Player(conn, name, slot);

    // Odadakilerin almadigi ilk karakteri ver - kimse ayni karakterle baslamasin
    const alinan = new Set(this.players.map((p) => p.char));
    for (let i = 0; i < cfg.CHAR_COUNT; i++) {
      const c = (slot + i) % cfg.CHAR_COUNT;
      if (!alinan.has(c)) { player.char = c; break; }
    }

    this.players.push(player);
    this.players.sort((a, b) => a.slot - b.slot);
    return player;
  }

  remove(player) {
    const i = this.players.indexOf(player);
    if (i >= 0) this.players.splice(i, 1);
    this.game.onPlayerLeft(player);
    if (this.isEmpty) this.dead = true;
  }

  // Baglanti koptu: oyuncuyu ATMA, yerini tut. Maci da duraklatir (bkz. gameLoop).
  markOffline(player) {
    player.connected = false;
    player.conn = null;
    player.offAt = Date.now();
    player.ready = false;
    this.game.dirty = true;
  }

  // Geri geldi: ayni slota, ayni skorla, ayni karakterle otur.
  reattach(player, conn) {
    player.conn = conn;
    player.connected = true;
    player.offAt = 0;
    this.game.dirty = true;
  }

  // Elinde dogru anahtar olan kopuk oyuncuyu bul.
  offlineByToken(token) {
    if (!token) return null;
    return this.players.find((p) => !p.connected && p.token === token) || null;
  }

  // Kopuk oyuncunun yerinin tutulmasina kac saniye kaldi (0 = kopuk yok)
  graceLeft() {
    let en = 0;
    const pay = (this.game.phase === 'lobby' ? cfg.LOBBY_GRACE : cfg.RECONNECT_GRACE) * 1000;
    for (const p of this.players) {
      if (p.connected) continue;
      en = Math.max(en, Math.ceil((pay - (Date.now() - p.offAt)) / 1000));
    }
    return Math.max(0, en);
  }

  broadcast(obj) {
    const msg = JSON.stringify(obj);
    for (const p of this.players) {
      if (p.connected) {
        try { p.conn.send(msg); } catch (e) { /* yoksay */ }
      }
    }
  }

  playersJSON() {
    return this.players.map((p) => p.toJSON());
  }

  tick(dt) {
    // Suresi dolan kopuk oyuncular gercekten atilir.
    if (this.players.some((p) => !p.connected)) {
      const pay = (this.game.phase === 'lobby' ? cfg.LOBBY_GRACE : cfg.RECONNECT_GRACE) * 1000;
      const now = Date.now();
      for (let i = this.players.length - 1; i >= 0; i--) {
        const p = this.players[i];
        if (!p.connected && now - p.offAt > pay) this.remove(p);
      }
      if (this.dead) return;
    }
    this.game.tick(dt);
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  makeCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  create() {
    const room = new Room(this.makeCode());
    this.rooms.set(room.code, room);
    return room;
  }

  // HIZLI OYNA: bekleyen acik bir oda varsa ona kat, yoksa yeni acik oda kur.
  hizliOda() {
    for (const [, room] of this.rooms) {
      if (room.dead || !room.acik) continue;
      if (room.isFull) continue;
      if (room.game.phase !== 'lobby') continue;   // maci baslamis odaya sokma
      return room;
    }
    const room = this.create();
    room.acik = true;
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').trim().toUpperCase()) || null;
  }

  tickAll(dt) {
    for (const [code, room] of this.rooms) {
      if (room.dead) { this.rooms.delete(code); continue; }
      room.tick(dt);
    }
  }
}

module.exports = { Room, Player, RoomManager };
