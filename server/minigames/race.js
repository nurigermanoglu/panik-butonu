'use strict';
// AT YARISI - tusa bastikca kosarsin. Bitis cizgisine ilk varan kazanir.
// (Eski "Buton Yagmuru" ile ayni mekanik, yaris pistine cevrildi.)

const TARGET = 100;
const PER_PRESS = 2.4;
const MAX_PRESS_PER_SEC = 22; // hile/otomatik tiklayici korumasi
const DURATION = 8;

module.exports = {
  id: 'race',
  name: 'AT YARISI',
  instruction: 'BAS BAS! KOS!',
  controls: 'action',
  duration: DURATION,

  create(playerIds) {
    const prog = {};
    const budget = {};
    const bitis = {};
    for (const id of playerIds) { prog[id] = 0; budget[id] = MAX_PRESS_PER_SEC; bitis[id] = -1; }

    return {
      ids: playerIds.slice(),
      prog,
      budget,
      bitis,
      t: 0,

      input(pid, a) {
        if (a !== 'press') return;
        if (this.prog[pid] === undefined) return;
        if (this.prog[pid] >= TARGET) return;
        if (this.budget[pid] <= 0) return;
        this.budget[pid]--;
        this.prog[pid] = Math.min(TARGET, this.prog[pid] + PER_PRESS);
        if (this.prog[pid] >= TARGET && this.bitis[pid] < 0) this.bitis[pid] = this.t;
      },

      update(dt) {
        this.t += dt;
        for (const id in this.budget) {
          this.budget[id] = Math.min(MAX_PRESS_PER_SEC, this.budget[id] + MAX_PRESS_PER_SEC * dt);
        }
      },

      // Herkes bitis cizgisini gectiyse tur erken bitsin
      done() {
        return this.ids.every((id) => this.prog[id] >= TARGET);
      },

      winners() {
        // once bitirenler, sonra en cok yol alan
        const bitiren = this.ids.filter((id) => this.bitis[id] >= 0);
        if (bitiren.length) {
          const enHizli = Math.min(...bitiren.map((id) => this.bitis[id]));
          const top = bitiren.filter((id) => this.bitis[id] <= enHizli + 1e-6);
          return top.length === this.ids.length ? [] : top;
        }
        const best = Math.max(...this.ids.map((id) => this.prog[id]));
        if (best <= 0) return [];
        const top2 = this.ids.filter((id) => this.prog[id] >= best - 0.001);
        return top2.length === this.ids.length ? [] : top2;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'FOTO BITIS! BERABERE';
        if (this.bitis[w[0]] >= 0) return this.bitis[w[0]].toFixed(1) + ' SANIYE!';
        return 'ONDE BITIRDI!';
      },

      snap() {
        const p = {};
        for (const id in this.prog) p[id] = Math.round(this.prog[id]);
        return { target: TARGET, p };
      },
    };
  },
};
