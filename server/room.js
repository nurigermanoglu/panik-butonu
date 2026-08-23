'use strict';
const crypto = require('crypto');
const cfg = require('./config');
const Game = require('./gameLoop');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karistirilabilir harfler (I,O,0,1) yok

// Sohbet metnini guvenli hale getirir: kontrol karakterleri (satir sonu,
// terminal kodlari) atilir, arka arkaya bosluklar tekillestirilir, boy kesilir.
// Istemci metni HER ZAMAN textContent ile basar; burasi ikinci savunma hatti.
function sohbetTemizle(metin) {
  if (typeof metin !== 'string') return '';
  let t = '';
  for (const ch of metin) {
    const k = ch.codePointAt(0);
    // Satir sonu/sekme BOSLUGA cevrilir; atilsa kelimeler birbirine yapisirdi
    if (k < 0x20 || k === 0x7f) { t += ' '; continue; }
    if (k >= 0x200b && k <= 0x200f) continue;          // gorunmez yon/genislik
    if (k >= 0x202a && k <= 0x202e) continue;          // yon degistirme
    t += ch;
  }
  return t.replace(/\s+/g, ' ').trim().slice(0, cfg.CHAT_MAX_LEN);
}

function adDuzenle(name) {
  return (name || '').toString().trim().slice(0, 10).toUpperCase() || 'OYUNCU';
}

class Player {
  constructor(conn, name, slot, cihaz) {
    this.conn = conn;
    this.name = adDuzenle(name);
    // Tarayiciya ozel gizli anahtar (localStorage'da durur). Sekmeyi kapatip
    // geri gelen kisiyi tanimak icin. toJSON'a KOYULMAZ - kimse gormemeli.
    this.cihaz = typeof cihaz === 'string' ? cihaz.slice(0, 64) : '';
    this.slot = slot;          // 0..MAX_PLAYERS-1  -> renk ve konum bu slota gore
    this.id = 'p' + slot;
    this.char = slot % cfg.CHAR_COUNT;   // baslangicta herkes farkli karakter
    this.sonMesajAn = 0;                 // sohbette ard arda yazmayi sinirlar
    this.ready = false;
    this.wins = 0;
    this.connected = true;
    // Bot oyuncular gercek oyuncu gibi slot/renk/karakter alir ama soketleri
    // yoktur: onlara paket gonderilmez, kopma/bekleme kurallari islemez.
    this.bot = false;
    this.botBekle = 0;   // bir sonraki hamleye kalan sure (saniye)

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
      bot: this.bot || undefined,
    };
  }
}

class Room {
  constructor(code) {
    this.code = code;
    this.players = [];         // hicbir yerde "oyuncu1/oyuncu2" sabiti yok - hep bu liste
    this.sohbet = [];          // son mesajlar; odaya girene toplu gonderilir
    this.winsNeeded = cfg.WINS_NEEDED;   // odayi kuran lobide degistirebilir
    this.botZorluk = cfg.BOT_ZORLUK;     // 0 kolay, 1 orta, 2 zor
    this.acik = false;                   // true = HIZLI OYNA havuzunda, yabancilar eslesebilir
    this.game = new Game(this);
    this.dead = false;
  }

  // Oda kurucusu = en dusuk slottaki oyuncu. Ayrilirsa sonraki oyuncu devralir.
  get hostId() {
    return this.players.length ? this.players[0].id : null;
  }

  get isFull() { return this.players.length >= cfg.MAX_PLAYERS; }
  // Sadece botlar kaldiysa oda bos sayilir: kimse yokken bot oynamasin
  get isEmpty() { return this.players.every((p) => p.bot); }

  freeSlot() {
    for (let s = 0; s < cfg.MAX_PLAYERS; s++) {
      if (!this.players.some((p) => p.slot === s)) return s;
    }
    return -1;
  }

  add(conn, name, cihaz) {
    const slot = this.freeSlot();
    if (slot < 0) return null;
    const player = new Player(conn, name, slot, cihaz);

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

  get botSayisi() {
    return this.players.filter((p) => p.bot).length;
  }

  get insanSayisi() {
    return this.players.filter((p) => !p.bot).length;
  }

  // Bot ekler. Odada en az bir insan kalmali, o yuzden bot sayisi
  // MAX_PLAYERS - 1 ile sinirli.
  botEkle() {
    if (this.isFull) return null;
    if (this.botSayisi >= cfg.BOT_ADLARI.length) return null;
    if (this.botSayisi >= cfg.MAX_PLAYERS - 1) return null;

    const slot = this.freeSlot();
    if (slot < 0) return null;

    // Kullanilmayan ilk bot adini sec
    const alinanAd = new Set(this.players.map((p) => p.name));
    const ad = cfg.BOT_ADLARI.find((a) => !alinanAd.has(a)) || 'BOT';

    const bot = new Player(null, ad, slot, '');
    bot.bot = true;
    bot.ready = true;           // bot her zaman hazir: insanlari bekletmesin

    const alinanChar = new Set(this.players.map((p) => p.char));
    for (let i = 0; i < cfg.CHAR_COUNT; i++) {
      const c = (slot + i) % cfg.CHAR_COUNT;
      if (!alinanChar.has(c)) { bot.char = c; break; }
    }

    this.players.push(bot);
    this.players.sort((a, b) => a.slot - b.slot);
    return bot;
  }

  // Son eklenen botu cikarir
  botCikar() {
    for (let i = this.players.length - 1; i >= 0; i--) {
      if (this.players[i].bot) {
        const bot = this.players[i];
        this.players.splice(i, 1);
        this.game.onPlayerLeft(bot);
        return bot;
      }
    }
    return null;
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

  // Elinde dogru anahtar olan oyuncuyu bul.
  //
  // "Kopuk olma" sarti ARANMAZ: sayfa F5 ile yenilendiginde yeni baglanti,
  // eskisinin kapandigi haberi sunucuya ulasmadan once gelebiliyor. O anda
  // oyuncu hala "bagli" gorundugu icin geri oturma reddedilir ve kisi odaya
  // ikinci kez katilmak zorunda kalirdi. Anahtar kimligi zaten kanitliyor.
  byToken(token) {
    if (!token) return null;
    return this.players.find((p) => p.token === token) || null;
  }

  // Bu cihazdan kopmus ve yeri hala tutulan biri var mi?
  // Sekmesini kapatip geri gelen kisi, oda "mac suruyor" diye disarida
  // kalmasin: eski yerine otursun.
  //
  // Eslesme ISIMLE YAPILMAZ. Isim herkesin ekraninda yaziyor; oda kodunu bilen
  // biri kopan oyuncuyla ayni ismi yazip onun slotuna, skoruna ve karakterine
  // oturabilirdi. Cihaz anahtari ise sadece sahibinin tarayicisinda durur.
  kopukCihazla(cihaz) {
    if (!cihaz || typeof cihaz !== 'string') return null;
    return this.players.find((p) => !p.connected && p.cihaz && p.cihaz === cihaz) || null;
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

  // Sohbet mesajini temizler ve odaya dagitir.
  // Geriye neden reddedildigi doner (null = kabul edildi).
  sohbetEkle(player, metin) {
    if (!player || !this.players.includes(player)) return 'yok';
    const temiz = sohbetTemizle(metin);
    if (!temiz) return 'bos';
    const simdi = Date.now();
    if (simdi - player.sonMesajAn < cfg.CHAT_MIN_ARA_MS) return 'hizli';
    player.sonMesajAn = simdi;
    // Slot da yazilir: rengi mesajin kendisi tasisin. Yoksa odaya yeni giren
    // gecmisi oyuncu listesi gelmeden cizer ve butun adlar notr renkte kalir.
    const kayit = { id: player.id, slot: player.slot, ad: player.name, m: temiz };
    this.sohbet.push(kayit);
    if (this.sohbet.length > cfg.CHAT_HISTORY) this.sohbet.shift();
    this.broadcast({ t: 'chat', ...kayit });
    return null;
  }

  broadcast(obj) {
    const msg = JSON.stringify(obj);
    for (const p of this.players) {
      // Botun soketi yok: p.conn null oldugu icin atlanmali
      if (p.bot || !p.connected) continue;
      try { p.conn.send(msg); } catch (e) { /* yoksay */ }
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
    const r = this.rooms.get(String(code || '').trim().toUpperCase());
    // Bosalmis oda bir sonraki tikte silinir; o arada birinin icine
    // girmesine izin verirsek oyun donmus bir odaya duser.
    return r && !r.dead ? r : null;
  }

  tickAll(dt) {
    for (const [code, room] of this.rooms) {
      if (room.dead) { this.rooms.delete(code); continue; }
      room.tick(dt);
    }
  }
}

module.exports = { Room, Player, RoomManager };
