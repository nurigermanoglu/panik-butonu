'use strict';
// WHAC-A-MOLE - deliklerden cikan kostebeklere vur. Bombaya vurursan puan kaybedersin.
//
// Cikis programi bir kez uretilir ve HERKES ayni deseni oynar - kimseye daha kolay desen dusmez.
// Her oyuncu kendi ekraninda ayni delikleri gorur; vurma hakki oyuncu basina ayridir.

// 7 delik: 3 ustte, 4 altta. Delikler buyuk oldugu icin dokunmasi kolay.
const HOLES = [
  { x: 80, y: 70 }, { x: 160, y: 70 }, { x: 240, y: 70 },
  { x: 40, y: 138 }, { x: 120, y: 138 }, { x: 200, y: 138 }, { x: 280, y: 138 },
];
// Vurus alani elips: yatayda 32, DIKEYDE daha genis (kostebek delikten yukari
// ciktigi icin ustune vurmak da sayilsin diye)
const { dereceler } = require('./siralama');
const HIT_RX = 32;
const HIT_RY = 40;
const RISE = 0.12;         // cikis/inis animasyon suresi
const MIN_GAP = 1.0;       // ayni delik bosaldiktan sonra en az bu kadar beklesin
const DURATION = 13;
const BOMB_CHANCE = 0.22;
const BOMB_PENALTY = 2;

module.exports = {
  id: 'mole',
  name: 'KOSTEBEK AVI',
  instruction: 'KOSTEBEKLERE VUR!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds, seviye) {
    const s = Math.max(0, Math.min(1, seviye || 0));
    const tempo = 1 + 0.40 * s;     // turlar ilerledikce %40'a kadar hizlanir
    const sure = DURATION;
    // Program: ayni anda 1-2 kostebek olacak sekilde.
    // AYNI DELIKTEN UST USTE CIKMA ENGELI: bir delik bosaldiktan sonra en az MIN_GAP
    // saniye beklenir ve ust uste ayni delik hic secilmez. Boylece oyuncu bir delige
    // vurduktan hemen sonra ayni yere tekrar vurmak zorunda kalmaz.
    const pops = [];
    const bosaldi = new Array(HOLES.length).fill(-99);   // deligin son bosalma ani
    let sonDelik = -1;
    let t = 0.6;

    while (t < sure - 0.5) {
      const dur = Math.max(0.34, (1.25 - t * 0.045) / tempo);   // tur icinde ve turlar boyunca kisalir

      let uygun = [];
      for (let h = 0; h < HOLES.length; h++) {
        if (h === sonDelik) continue;                    // ust uste ayni delik olmaz
        if (t < bosaldi[h] + MIN_GAP) continue;          // yeni bosalmis delik dinlensin
        uygun.push(h);
      }
      if (!uygun.length) {                               // hicbiri uygun degilse kurali gevset
        for (let h = 0; h < HOLES.length; h++) if (h !== sonDelik) uygun.push(h);
      }

      const h = uygun[Math.floor(Math.random() * uygun.length)];
      pops.push({ t, h, bomb: Math.random() < BOMB_CHANCE, dur });
      bosaldi[h] = t + dur;
      sonDelik = h;
      t += Math.max(0.20, (0.85 - t * 0.035) / tempo);
    }

    const pl = {};
    for (const id of playerIds) pl[id] = { score: 0, done: {}, flash: 0, flashGood: true };

    return {
      ids: playerIds.slice(),
      sure,
      pops,
      pl,
      t: 0,

      // O an ekranda olan cikislar
      activeList() {
        const out = [];
        for (let i = 0; i < this.pops.length; i++) {
          const p = this.pops[i];
          if (this.t < p.t || this.t > p.t + p.dur) continue;
          const el = this.t - p.t;
          const left = p.t + p.dur - this.t;
          const rise = Math.min(1, Math.min(el, left) / RISE);
          out.push({ i, h: p.h, bomb: p.bomb, r: Math.max(0, rise) });
        }
        return out;
      },

      input(pid, a, d) {
        if (a !== 'grab') return;              // tek dokunus = vurus
        const me = this.pl[pid];
        if (!me || !d) return;
        const x = Number(d.x), y = Number(d.y);
        if (!isFinite(x) || !isFinite(y)) return;

        const act = this.activeList();
        let best = null, bestD = 1;                 // elipste 1 = tam kenar
        for (const a2 of act) {
          if (me.done[a2.i]) continue;
          const hole = HOLES[a2.h];
          const dx = (hole.x - x) / HIT_RX, dy = (hole.y - y) / HIT_RY;
          const dd = dx * dx + dy * dy;
          if (dd <= bestD) { bestD = dd; best = a2; }
        }
        if (!best) return;

        me.done[best.i] = true;
        if (best.bomb) {
          me.score -= BOMB_PENALTY;
          me.flash = 0.35; me.flashGood = false;
        } else {
          me.score += 1;
          me.flash = 0.2; me.flashGood = true;
        }
      },

      update(dt) {
        this.t += dt;
        for (const id of this.ids) {
          if (this.pl[id].flash > 0) this.pl[id].flash -= dt;
        }
      },

      done() { return false; },   // sure dolana kadar surer

      // Skor yuksek olan onde (bomba cezasi skoru dusurur).
      derece() {
        return dereceler(this.ids, (id) => -this.pl[id].score);
      },

      winners() {
        const best = Math.max(...this.ids.map((id) => this.pl[id].score));
        if (best <= 0) return [];
        const top = this.ids.filter((id) => this.pl[id].score === best);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'TAM BERABERE!';
        return this.pl[w[0]].score + ' KOSTEBEK!';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          const vurulan = [];
          for (const a of this.activeList()) if (me.done[a.i]) vurulan.push(a.i);
          pl[id] = { s: me.score, hit: vurulan, fl: me.flash > 0 ? (me.flashGood ? 1 : 2) : 0 };
        }
        return {
          holes: HOLES, rx: HIT_RX, ry: HIT_RY,
          act: this.activeList(),
          pl,
        };
      },
    };
  },
};
