'use strict';
// SEKIL YERLESTIR - sekilleri surukleyip kendi yuvalarina tak.
//
// Yuva sirasi ve sekillerin baslangic yerleri bir kez karistirilir, HERKES ayni duzeni oynar.

const { dereceler } = require('./siralama');
const TIPLER = ['kare', 'ucgen', 'daire', 'arti', 'yildiz'];
const SLOT_Y = 64;
const HOME_Y = 142;
const XS = [38, 100, 160, 222, 282];
const GRAB_R = 19;      // sekiller buyudu, tutma alani da buyudu
const DROP_R = 21;
const DURATION = 14;

function karistir(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}

module.exports = {
  id: 'shapesort',
  name: 'SEKIL YERLESTIR',
  instruction: 'SEKILLERI YERINE KOY!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    // Sekil sayisi ekrana sabit yerlesmis (5 yuva); hizlanma sureyi kisaltarak olur
    const sure = DURATION * (1 - 0.28 * sv);

    const yuvaSirasi = karistir(TIPLER);          // ustteki yuvalarin sirasi
    const sekilSirasi = karistir(TIPLER);         // alttaki sekillerin sirasi

    const slots = yuvaSirasi.map((tip, i) => ({ tip, x: XS[i], y: SLOT_Y }));

    const pl = {};
    for (const id of playerIds) {
      pl[id] = {
        shapes: sekilSirasi.map((tip, i) => ({
          tip, x: XS[i], y: HOME_Y, hx: XS[i], hy: HOME_Y, st: 0, slot: -1,
        })),
        held: -1, score: 0, lastAt: sure, flash: 0, good: true,
      };
    }

    return {
      ids: playerIds.slice(),
      sure,
      slots,
      pl,
      t: 0,

      input(pid, a, d) {
        const me = this.pl[pid];
        if (!me || !d) return;
        const x = Number(d.x), y = Number(d.y);
        if (!isFinite(x) || !isFinite(y)) return;

        if (a === 'grab') {
          if (me.held >= 0) return;
          let best = -1, bestD = GRAB_R * GRAB_R;
          for (let i = 0; i < me.shapes.length; i++) {
            const s = me.shapes[i];
            if (s.st !== 0) continue;
            const dx = s.x - x, dy = s.y - y, dd = dx * dx + dy * dy;
            if (dd <= bestD) { bestD = dd; best = i; }
          }
          if (best >= 0) {
            me.shapes[best].st = 1;
            me.shapes[best].x = x; me.shapes[best].y = y;
            me.held = best;
          }
          return;
        }

        if (a === 'drag') {
          if (me.held < 0) return;
          me.shapes[me.held].x = x;
          me.shapes[me.held].y = y;
          return;
        }

        if (a === 'drop') {
          if (me.held < 0) return;
          const s = me.shapes[me.held];
          me.held = -1;

          let hedef = -1;
          for (let i = 0; i < this.slots.length; i++) {
            const sl = this.slots[i];
            if (me.shapes.some((q) => q.st === 2 && q.slot === i)) continue;   // yuva dolu
            const dx = sl.x - x, dy = sl.y - y;
            if (dx * dx + dy * dy <= DROP_R * DROP_R) { hedef = i; break; }
          }

          if (hedef >= 0 && this.slots[hedef].tip === s.tip) {
            s.st = 2;
            s.slot = hedef;
            s.x = this.slots[hedef].x;
            s.y = this.slots[hedef].y;
            me.score++;
            me.lastAt = this.t;
            me.flash = 0.2; me.good = true;
          } else {
            s.st = 0;
            s.x = s.hx; s.y = s.hy;
            if (hedef >= 0) { me.flash = 0.3; me.good = false; }   // yanlis yuva
          }
        }
      },

      update(dt) {
        this.t += dt;
        for (const id of this.ids) if (this.pl[id].flash > 0) this.pl[id].flash -= dt;
      },

      done() {
        return this.ids.every((id) => this.pl[id].score >= TIPLER.length);
      },

      // Skor onde gelir; esit skorda isini ONCE bitiren ustte olur.
      // Skor 1000 kat agirlikli oldugu icin zaman yalnizca esitligi bozar.
      derece() {
        return dereceler(this.ids, (id) => {
          const me = this.pl[id];
          return -me.score * 1000 + me.lastAt;
        });
      },

      winners() {
        const best = Math.max(...this.ids.map((id) => this.pl[id].score));
        if (best <= 0) return [];
        const top = this.ids.filter((id) => this.pl[id].score === best);
        if (top.length === 1) return top;
        const hizli = Math.min(...top.map((id) => this.pl[id].lastAt));
        const win = top.filter((id) => this.pl[id].lastAt <= hizli + 1e-6);
        return win.length === this.ids.length ? [] : win;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'TAM BERABERE!';
        const s = this.pl[w[0]].score;
        return s >= TIPLER.length ? 'HEPSINI TAKTI!' : s + ' / ' + TIPLER.length + ' SEKIL';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          pl[id] = {
            s: me.score, h: me.held, fl: me.flash > 0 ? (me.good ? 1 : 2) : 0,
            sh: me.shapes.map((q) => ({
              t: q.tip, x: Math.round(q.x), y: Math.round(q.y), st: q.st, sl: q.slot,
            })),
          };
        }
        return { slots: this.slots, total: TIPLER.length, pl };
      },
    };
  },
};
