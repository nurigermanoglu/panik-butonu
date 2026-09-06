'use strict';
// SICAK PATATES - bomba rastgele birinde baslar. Tusa basinca rastgele BASKA birine gecer.
// Fitil el degistirse de yanmaya devam eder; patladigi anda bombayi tutan elenir.
// Tek kisi kalana kadar surer, kalan kazanir.

const { dereceler } = require('./siralama');
const FUSE_MIN = 2.6;
const FUSE_MAX = 6.4;
const HOLD_MIN = 0.18;     // bombayi en az bu kadar tutmak zorundasin (hemen sektirme yok)
const BOOM_SHOW = 0.6;     // patlama gosterimi
const DURATION = 30;       // 4 kisi icin 3 elenme + pay

function rastgele(min, max) { return min + Math.random() * (max - min); }

module.exports = {
  id: 'hotpotato',
  name: 'SICAK PATATES',
  instruction: 'BOMBAYI ELDEN CIKAR!',
  controls: 'action',
  duration: DURATION,

  create(playerIds, seviye) {
    const s = Math.max(0, Math.min(1, seviye || 0));
    const kisalt = 1 - 0.35 * s;    // fitil %35'e kadar kisalir
    const alive = {};
    for (const id of playerIds) alive[id] = true;

    const ilk = playerIds[Math.floor(Math.random() * playerIds.length)];

    return {
      ids: playerIds.slice(),
      alive,
      holder: ilk,
      kisalt,                  // fitil carpani (turlar ilerledikce kucilur)
      fuse: rastgele(FUSE_MIN * kisalt, FUSE_MAX * kisalt),
      fuseMax: 0,
      held: 0,                 // mevcut sahibin bombayi tutma suresi
      boom: 0,
      boomWho: null,
      elenme: [],

      aliveIds() { return this.ids.filter((id) => this.alive[id]); },

      start() { this.fuseMax = this.fuse; },

      pass() {
        const others = this.aliveIds().filter((id) => id !== this.holder);
        if (!others.length) return;
        this.holder = others[Math.floor(Math.random() * others.length)];
        this.held = 0;
      },

      input(pid, a) {
        if (a !== 'press') return;
        if (pid !== this.holder) return;
        if (this.boom > 0) return;
        if (this.held < HOLD_MIN) return;
        this.pass();
      },

      update(dt) {
        if (this.boom > 0) {
          this.boom -= dt;
          return;                       // patlama gosterimi sirasinda fitil durur
        }

        const kalan = this.aliveIds();
        if (kalan.length <= 1) return;

        this.held += dt;
        this.fuse -= dt;

        if (this.fuse <= 0) {
          // bombayi tutan elendi
          this.alive[this.holder] = false;
          this.elenme.push(this.holder);
          this.boom = BOOM_SHOW;
          this.boomWho = this.holder;

          const yeni = this.aliveIds();
          if (yeni.length > 1) {
            this.holder = yeni[Math.floor(Math.random() * yeni.length)];
            this.fuse = rastgele(FUSE_MIN * this.kisalt, FUSE_MAX * this.kisalt);
            this.fuseMax = this.fuse;
            this.held = 0;
          } else {
            this.holder = null;
            this.fuse = 0;
          }
        }
      },

      done() {
        return this.aliveIds().length <= 1 && this.boom <= 0;
      },

      // Ayakta kalanlar esit birinci; elenenler arasinda GEC elenen onde.
      // elenme dizisi elenme sirasini tutuyor: ilk elenen en kotu derece.
      derece() {
        return dereceler(this.ids, (id) =>
          this.alive[id] ? -1e6 : -this.elenme.indexOf(id));
      },

      winners() {
        const kalan = this.aliveIds();
        if (!kalan.length) return [];
        return kalan.length === this.ids.length ? [] : kalan;
      },

      text() {
        const w = this.winners();
        if (!w.length) return { k: 'sonuc.hotpotato.patlamadi' };
        if (w.length === 1) return { k: 'sonuc.hotpotato.sonKurtulan' };
        return { k: 'sonuc.hotpotato.ayakta' };
      },

      snap() {
        return {
          holder: this.holder,
          fuse: Math.max(0, Math.round(this.fuse * 10) / 10),
          fuseMax: Math.round(this.fuseMax * 10) / 10,
          alive: this.alive,
          boom: this.boom > 0,
          boomWho: this.boomWho,
          canPass: this.held >= HOLD_MIN,
        };
      },
    };
  },
};
