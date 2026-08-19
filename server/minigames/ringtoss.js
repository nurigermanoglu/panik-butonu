'use strict';
// HALKA GECIRME - halkalari parmakla/fareyle surukleyip saga sola salinan siselerin boynuna gecir.
//
// Her oyuncu KENDI halkalariyla oynar; siseler ise herkes icin ayni anda ayni yerde salinir
// (hareket zamanin fonksiyonu, rastgelelik yok) - yani kimse daha kolay/zor bir desen almaz.

const NECK_Y = 76;       // halkanin boyna gecmesi icin denk gelmesi gereken yukseklik
const TOL = 14;          // boyna gecme toleransi (yaricap)
const GRAB_R = 15;       // yigindan halka tutma yaricapi
const PILE_Y = 152;
const RING_COUNT = 6;
const MAX_PER_BOTTLE = 3;
const DURATION = 14;

const BOTTLES = [
  { base: 62, amp: 34, speed: 1.05, phase: 0.0 },
  { base: 160, amp: 46, speed: 1.35, phase: 1.2 },
  { base: 258, amp: 32, speed: 0.85, phase: 2.4 },
];

module.exports = {
  id: 'ringtoss',
  name: 'HALKA GECIRME',
  instruction: 'HALKALARI SISELERE TAK!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds) {
    const pl = {};
    for (const id of playerIds) {
      const rings = [];
      for (let i = 0; i < RING_COUNT; i++) {
        const hx = 34 + i * 50;
        rings.push({ x: hx, y: PILE_Y, hx, hy: PILE_Y, st: 0, b: -1, k: 0 });
      }
      pl[id] = { rings, held: -1, score: 0, lastAt: DURATION };
    }

    return {
      ids: playerIds.slice(),
      pl,
      t: 0,

      bottleX(b) {
        const x = b.base + b.amp * Math.sin(this.t * b.speed + b.phase);
        return Math.max(16, Math.min(304, x));
      },

      input(pid, a, d) {
        const me = this.pl[pid];
        if (!me || !d) return;
        const x = Number(d.x), y = Number(d.y);
        if (!isFinite(x) || !isFinite(y)) return;

        if (a === 'grab') {
          if (me.held >= 0) return;
          let best = -1, bestD = GRAB_R * GRAB_R;
          for (let i = 0; i < me.rings.length; i++) {
            const r = me.rings[i];
            if (r.st !== 0) continue;
            const dx = r.x - x, dy = r.y - y, dd = dx * dx + dy * dy;
            if (dd <= bestD) { bestD = dd; best = i; }
          }
          if (best >= 0) {
            me.rings[best].st = 1;
            me.rings[best].x = x;
            me.rings[best].y = y;
            me.held = best;
          }
          return;
        }

        if (a === 'drag') {
          if (me.held < 0) return;
          const r = me.rings[me.held];
          r.x = x; r.y = y;
          return;
        }

        if (a === 'drop') {
          if (me.held < 0) return;
          const r = me.rings[me.held];
          me.held = -1;

          let hit = -1;
          for (let i = 0; i < BOTTLES.length; i++) {
            const bx = this.bottleX(BOTTLES[i]);
            const onBottle = me.rings.filter((q) => q.st === 2 && q.b === i).length;
            if (onBottle >= MAX_PER_BOTTLE) continue;
            const dx = bx - x, dy = NECK_Y - y;
            if (dx * dx + dy * dy <= TOL * TOL) { hit = i; break; }
          }

          if (hit >= 0) {
            r.st = 2;
            r.b = hit;
            r.k = me.rings.filter((q) => q.st === 2 && q.b === hit && q !== r).length;
            me.score++;
            me.lastAt = this.t;
          } else {
            r.st = 0;
            r.x = r.hx;
            r.y = r.hy;
          }
        }
      },

      update(dt) { this.t += dt; },

      // Herkes butun halkalarini taktiysa tur erken bitsin
      done() {
        return this.ids.every((id) => this.pl[id].rings.every((r) => r.st === 2));
      },

      winners() {
        const best = Math.max(...this.ids.map((id) => this.pl[id].score));
        if (best <= 0) return [];
        const top = this.ids.filter((id) => this.pl[id].score === best);
        if (top.length === 1) return top;
        // esitlik: once bitiren kazanir
        const fastest = Math.min(...top.map((id) => this.pl[id].lastAt));
        const win = top.filter((id) => this.pl[id].lastAt <= fastest + 1e-6);
        return win.length === this.ids.length ? [] : win;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'TAM BERABERE!';
        return this.pl[w[0]].score + ' / ' + RING_COUNT + ' HALKA!';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          pl[id] = {
            s: this.pl[id].score,
            h: this.pl[id].held,
            r: this.pl[id].rings.map((r) => ({
              x: Math.round(r.x), y: Math.round(r.y), st: r.st, b: r.b, k: r.k,
            })),
          };
        }
        return {
          neck: NECK_Y, tol: TOL, pileY: PILE_Y, total: RING_COUNT,
          bottles: BOTTLES.map((b) => Math.round(this.bottleX(b))),
          pl,
        };
      },
    };
  },
};
