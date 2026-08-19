'use strict';
// SISE VURMA - ekranda ucan siselere dokunarak/tiklayarak ates et. Kirmizi bombaya vurma!
//
// Hedef programi bir kez uretilir ve HERKES ayni deseni oynar. Vurus hakki oyuncu basina ayridir:
// senin vurdugun hedef sadece senin ekranindan kalkar.

const TOP = 30;            // oyun alaninin ust siniri
const BOT = 168;
const TW = 10, TH = 16;    // hedef boyutu
const PAD = 7;             // isabet payi (comert olsun)
const DURATION = 13;
const BOMB_CHANCE = 0.24;
const BOMB_PENALTY = 2;

module.exports = {
  id: 'shooting',
  name: 'SISE VURMA',
  instruction: 'UCAN SISELERI VUR!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds) {
    const plan = [];
    let t = 0.5;
    while (t < DURATION - 0.6) {
      plan.push({
        t,
        y: TOP + 6 + Math.random() * (BOT - TOP - TH - 12),
        v: 58 + Math.random() * 46 + t * 3.4,        // zamanla hizlanir
        dir: Math.random() < 0.5 ? 1 : -1,
        bomb: Math.random() < BOMB_CHANCE,
      });
      t += Math.max(0.34, 0.8 - t * 0.028);
    }

    const pl = {};
    for (const id of playerIds) pl[id] = { score: 0, hit: {}, flash: 0, good: true };

    return {
      ids: playerIds.slice(),
      plan,
      pl,
      t: 0,

      // hedefin o andaki x konumu (yoksa null)
      posX(p) {
        const el = this.t - p.t;
        if (el < 0) return null;
        const x = p.dir > 0 ? -TW - 8 + el * p.v : 320 + 8 - el * p.v;
        if (x < -TW - 10 || x > 320 + 10) return null;
        return x;
      },

      activeList() {
        const out = [];
        for (let i = 0; i < this.plan.length; i++) {
          const x = this.posX(this.plan[i]);
          if (x === null) continue;
          out.push({ i, x: Math.round(x), y: Math.round(this.plan[i].y), bomb: this.plan[i].bomb });
        }
        return out;
      },

      input(pid, a, d) {
        if (a !== 'grab') return;               // tek dokunus = ates
        const me = this.pl[pid];
        if (!me || !d) return;
        const x = Number(d.x), y = Number(d.y);
        if (!isFinite(x) || !isFinite(y)) return;

        for (const tg of this.activeList()) {
          if (me.hit[tg.i]) continue;
          if (x < tg.x - PAD || x > tg.x + TW + PAD) continue;
          if (y < tg.y - PAD || y > tg.y + TH + PAD) continue;
          me.hit[tg.i] = true;
          if (tg.bomb) { me.score -= BOMB_PENALTY; me.flash = 0.35; me.good = false; }
          else { me.score += 1; me.flash = 0.2; me.good = true; }
          return;                               // tek atisla tek hedef
        }
      },

      update(dt) {
        this.t += dt;
        for (const id of this.ids) if (this.pl[id].flash > 0) this.pl[id].flash -= dt;
      },

      done() { return false; },

      winners() {
        const best = Math.max(...this.ids.map((id) => this.pl[id].score));
        if (best <= 0) return [];
        const top = this.ids.filter((id) => this.pl[id].score === best);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'TAM BERABERE!';
        return this.pl[w[0]].score + ' ISABET!';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          const vurulan = [];
          for (const tg of this.activeList()) if (me.hit[tg.i]) vurulan.push(tg.i);
          pl[id] = { s: me.score, hit: vurulan, fl: me.flash > 0 ? (me.good ? 1 : 2) : 0 };
        }
        return { tw: TW, th: TH, top: TOP, bot: BOT, act: this.activeList(), pl };
      },
    };
  },
};
