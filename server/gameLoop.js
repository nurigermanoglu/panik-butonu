'use strict';
const cfg = require('./config');
const MINIGAMES = require('./minigames');

// Faz akisi:  lobby -> intro -> play -> result -> (intro | gameover)
class Game {
  constructor(room) {
    this.room = room;
    this.phase = 'lobby';
    this.timer = 0;
    this.mg = null;        // mini oyun modulu (meta)
    this.inst = null;      // mini oyun ornegi (mantik)
    this.tur = 0;          // kacinci tur oynaniyor (hiz bunun uzerinden artar)
    this.bag = [];         // karistirilmis torba: her oyun tekrar etmeden bir kez gelir
    this.lastId = null;
    this.result = null;
    this.winner = null;
    this.notice = null;
    this.dirty = true;
    this.refresh = 0;
  }

  // ---------- oyuncu komutlari ----------

  setReady(player, value) {
    if (this.phase !== 'lobby') return;
    player.ready = !!value;
    this.dirty = true;
    this.tryStart();
  }

  tryStart() {
    const ps = this.room.players;
    if (ps.length < cfg.MIN_PLAYERS) return;
    if (!ps.every((p) => p.ready)) return;
    for (const p of ps) { p.wins = 0; p.ready = false; }
    this.notice = null;
    this.tur = 0;
    this.bag = [];
    this.nextRound();
  }

  // Hedef turu (kac galibiyet sampiyon eder) - sadece odayi kuran, sadece lobide
  setTarget(player, delta) {
    if (this.phase !== 'lobby') return;
    if (player.id !== this.room.hostId) return;
    const d = Number(delta) < 0 ? -1 : 1;
    const next = this.room.winsNeeded + d;
    this.room.winsNeeded = Math.max(cfg.WINS_MIN, Math.min(cfg.WINS_MAX, next));
    this.dirty = true;
  }

  // Karakter secimi - herkes kendi karakterini lobide degistirir.
  // Baskasinin sectigi karakter atlanir: iki kisi ayni karakteri alamaz.
  setChar(player, delta) {
    if (this.phase !== 'lobby') return;
    const n = cfg.CHAR_COUNT;
    const d = Number(delta) < 0 ? -1 : 1;
    const alinan = new Set(
      this.room.players.filter((p) => p !== player).map((p) => p.char)
    );
    let c = player.char;
    for (let i = 0; i < n; i++) {
      c = (((c + d) % n) + n) % n;
      if (!alinan.has(c)) {
        player.char = c;
        this.dirty = true;
        return;
      }
    }
  }

  requestRematch(player) {
    // Iki oyuncu ayni anda basarsa: ikincisi lobiye dusmus olur, onu hazir say.
    if (this.phase === 'lobby') return this.setReady(player, true);
    if (this.phase !== 'gameover') return;
    this.toLobby(null);
    player.ready = true;
  }

  handleInput(player, action, data) {
    if (this.phase !== 'play' || !this.inst) return;
    // Gecikme bilgisi de gecirilir: refleks turu bunu adalet/hile siniri icin kullanir
    this.inst.input(player.id, action, data, player.conn ? player.conn.rtt || 0 : 0);
  }

  onPlayerLeft(player) {
    if (this.phase === 'lobby') { this.dirty = true; return; }
    this.toLobby(player.name + ' AYRILDI');
  }

  // ---------- faz gecisleri ----------

  toLobby(notice) {
    this.phase = 'lobby';
    this.timer = 0;
    this.mg = null;
    this.inst = null;
    this.result = null;
    this.winner = null;
    this.notice = notice;
    for (const p of this.room.players) { p.ready = false; p.wins = 0; }
    this.tur = 0;
    this.dirty = true;
  }

  // Torba yontemi: butun mini oyunlar bir tur icinde birer kez gelir, sonra torba yenilenir.
  pickMinigame() {
    if (!this.bag.length) {
      this.bag = MINIGAMES.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = tmp;
      }
      // yeni torbanin ilki, bir onceki turun oyunuyla ayni olmasin
      if (this.lastId && this.bag.length > 1 && this.bag[0].id === this.lastId) {
        const tmp = this.bag[0]; this.bag[0] = this.bag[1]; this.bag[1] = tmp;
      }
    }
    const chosen = this.bag.shift();
    this.lastId = chosen.id;
    return chosen;
  }

  // 0 = ilk tur (normal hiz), 1 = en yuksek hiz. Aradaki turlarda dogru orantili.
  seviye() {
    const n = Math.max(2, cfg.SPEED_ROUNDS);
    return Math.max(0, Math.min(1, (this.tur - 1) / (n - 1)));
  }

  nextRound() {
    this.tur++;
    this.mg = this.pickMinigame();
    // Mini oyun kendi hizini bu seviyeye gore ayarlar.
    this.inst = this.mg.create(this.room.players.map((p) => p.id), this.seviye());
    this.result = null;
    this.phase = 'intro';
    this.timer = cfg.INTRO_TIME;
    this.dirty = true;
  }

  startPlay() {
    this.phase = 'play';
    // Oyun kendi suresini kisaltmis olabilir (hizlandikca sureler de kisalir)
    this.timer = (this.inst && this.inst.sure) || this.mg.duration;
    if (this.inst.start) this.inst.start();
  }

  finishRound() {
    const winners = this.inst.winners() || [];
    for (const p of this.room.players) {
      if (winners.includes(p.id)) p.wins++;
    }
    this.result = { winners, text: this.inst.text ? this.inst.text() : '' };
    this.phase = 'result';
    this.timer = cfg.RESULT_TIME;
    this.dirty = true;
  }

  afterResult() {
    const champ = this.room.players.find((p) => p.wins >= this.room.winsNeeded);
    if (champ) {
      this.winner = champ.id;
      this.phase = 'gameover';
      this.timer = 0;
      this.inst = null;
      this.mg = null;
      this.dirty = true;
    } else {
      this.nextRound();
    }
  }

  // ---------- ana dongu ----------

  tick(dt) {
    // Biri kopmussa mac DURUR. Yoksa o kisi geri geldiginde turlari kaybetmis
    // olurdu; 3 saniyelik bir wifi takilmasi maci bitirebilirdi.
    // Lobide ve sampiyon ekraninda duraklatmanin anlami yok.
    const kopuk = this.room.players.some((p) => !p.connected);
    const canli = this.phase === 'intro' || this.phase === 'play' || this.phase === 'result';
    if (kopuk && canli) {
      this.dirty = true;
      this.room.broadcast(this.snapshot());
      return;
    }

    switch (this.phase) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) this.startPlay();
        break;

      case 'play':
        this.timer -= dt;
        this.inst.update(dt);
        if (this.inst.done() || this.timer <= 0) {
          this.timer = Math.max(0, this.timer);
          this.finishRound();
        }
        break;

      case 'result':
        this.timer -= dt;
        if (this.timer <= 0) this.afterResult();
        break;

      default:
        break; // lobby / gameover: zamanlayici yok
    }

    // Lobi/sampiyon ekraninda saniyede bir tazele: ping gostergesi canli kalsin
    if (this.phase === 'lobby' || this.phase === 'gameover') {
      this.refresh += dt;
      if (this.refresh >= 1) { this.refresh = 0; this.dirty = true; }
    }

    const live = this.phase === 'intro' || this.phase === 'play' || this.phase === 'result';
    if (live || this.dirty) {
      this.room.broadcast(this.snapshot());
      this.dirty = false;
    }
  }

  snapshot() {
    return {
      t: 'sync',
      code: this.room.code,
      phase: this.phase,
      timer: Math.round(this.timer * 100) / 100,
      players: this.room.playersJSON(),
      mg: this.mg
        ? { id: this.mg.id, name: this.mg.name, instruction: this.mg.instruction, controls: this.mg.controls, dur: Math.round(((this.inst && this.inst.sure) || this.mg.duration) * 10) / 10 }
        : null,
      st: this.inst && this.phase !== 'intro' ? this.inst.snap() : null,
      result: this.result,
      winner: this.winner,
      notice: this.notice,
      needed: this.room.winsNeeded,
      tur: this.tur,
      seviye: Math.round(this.seviye() * 100) / 100,
      // Kopuk oyuncu varsa: kimi bekledigimiz ve kac saniye kaldigi
      bekle: this.room.players.some((p) => !p.connected)
        ? {
            ad: this.room.players.filter((p) => !p.connected).map((p) => p.name).join(', '),
            sn: this.room.graceLeft(),
          }
        : null,
      host: this.room.hostId,
      acik: this.room.acik,
      needMin: cfg.WINS_MIN,
      needMax: cfg.WINS_MAX,
      max: cfg.MAX_PLAYERS,
      min: cfg.MIN_PLAYERS,
    };
  }
}

module.exports = Game;
