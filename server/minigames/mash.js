'use strict';
// BUTON YAGMURU - kim daha hizli basarsa cubugunu once doldurur.

const TARGET = 100;
const PER_PRESS = 2.4;
const MAX_PRESS_PER_SEC = 22; // hile/otomatik tiklayici korumasi

module.exports = {
  id: 'mash',
  name: 'BUTON YAGMURU',
  instruction: 'HIZLI BAS!',
  controls: 'action',
  duration: 8,

  create(playerIds) {
    const prog = {};
    const budget = {};
    for (const id of playerIds) { prog[id] = 0; budget[id] = MAX_PRESS_PER_SEC; }

    return {
      prog,
      budget,
      t: 0,

      input(pid, a) {
        if (a !== 'press') return;
        if (this.prog[pid] === undefined) return;
        if (this.budget[pid] <= 0) return;
        this.budget[pid]--;
        this.prog[pid] = Math.min(TARGET, this.prog[pid] + PER_PRESS);
      },

      update(dt) {
        this.t += dt;
        for (const id in this.budget) {
          this.budget[id] = Math.min(MAX_PRESS_PER_SEC, this.budget[id] + MAX_PRESS_PER_SEC * dt);
        }
      },

      done() {
        return Object.values(this.prog).some((v) => v >= TARGET);
      },

      winners() {
        const best = Math.max(...Object.values(this.prog));
        if (best <= 0) return [];
        const top = Object.keys(this.prog).filter((id) => this.prog[id] >= best - 0.001);
        return top.length === Object.keys(this.prog).length ? [] : top;
      },

      text() {
        return this.winners().length ? 'PARMAKLAR YANDI!' : 'TAM BERABERE!';
      },

      snap() {
        const p = {};
        for (const id in this.prog) p[id] = Math.round(this.prog[id]);
        return { target: TARGET, p };
      },
    };
  },
};
