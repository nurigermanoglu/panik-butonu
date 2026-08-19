'use strict';
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
  }
  toJSON() {
    return {
      id: this.id, name: this.name, slot: this.slot, char: this.char,
      ready: this.ready, wins: this.wins,
      ping: this.conn ? this.conn.rtt || 0 : 0,
    };
  }
}

class Room {
  constructor(code) {
    this.code = code;
    this.players = [];         // hicbir yerde "oyuncu1/oyuncu2" sabiti yok - hep bu liste
    this.winsNeeded = cfg.WINS_NEEDED;   // odayi kuran lobide degistirebilir
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
