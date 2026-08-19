'use strict';
// HAFIZA DIZISI - gosterilen ok dizisini once dogru tekrarlayan kazanir. Yanlis tus -> elenirsin.

const DIRS = ['up', 'down', 'left', 'right'];
const SEQ_LEN = 4;
const LEAD_IN = 0.6;   // gosterim baslamadan once bekleme
const ON_TIME = 0.5;   // her sembol ekranda kalma suresi
const OFF_TIME = 0.22; // semboller arasi bosluk

module.exports = {
  id: 'memory',
  name: 'HAFIZA DIZISI',
  instruction: 'DIZIYI EZBERLE!',
  controls: 'dpad',
  duration: 14,

  create(playerIds) {
    const seq = [];
    for (let i = 0; i < SEQ_LEN; i++) seq.push(DIRS[Math.floor(Math.random() * DIRS.length)]);

    const prog = {};
    const out = {};
    for (const id of playerIds) { prog[id] = 0; out[id] = false; }

    const showTotal = LEAD_IN + SEQ_LEN * (ON_TIME + OFF_TIME);

    return {
      ids: playerIds.slice(),
      seq,
      prog,
      out,
      t: 0,
      showing: true,
      winner: null,

      input(pid, a, d) {
        if (a !== 'dir') return;
        if (this.showing || this.winner) return;
        if (this.out[pid] === undefined || this.out[pid]) return;
        if (!DIRS.includes(d)) return;

        if (this.seq[this.prog[pid]] === d) {
          this.prog[pid]++;
          if (this.prog[pid] >= this.seq.length) this.winner = pid;
        } else {
          this.out[pid] = true;   // yanlis tus -> bu tur bitti
        }
      },

      update(dt) {
        this.t += dt;
        if (this.showing && this.t >= showTotal) this.showing = false;
      },

      done() {
        if (this.winner) return true;
        if (this.showing) return false;
        return this.ids.every((id) => this.out[id]);
      },

      winners() {
        if (this.winner) return [this.winner];
        // kimse bitiremediyse en cok ilerleyen kazanir
        const best = Math.max(...this.ids.map((id) => this.prog[id]));
        if (best <= 0) return [];
        const top = this.ids.filter((id) => this.prog[id] === best);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        if (this.winner) return 'HAFIZA CANAVARI!';
        if (!this.winners().length) {
          return this.ids.every((id) => this.out[id]) ? 'HEPSI SASIRDI!' : 'KIMSE BITIREMEDI!';
        }
        return 'EN COK ILERLEYEN!';
      },

      // Gosterim sirasinda hangi sembolun ekranda oldugunu hesapla
      currentSymbol() {
        if (!this.showing) return null;
        const rel = this.t - LEAD_IN;
        if (rel < 0) return null;
        const idx = Math.floor(rel / (ON_TIME + OFF_TIME));
        if (idx >= this.seq.length) return null;
        const inCell = rel - idx * (ON_TIME + OFF_TIME);
        return inCell <= ON_TIME ? this.seq[idx] : null;
      },

      snap() {
        return {
          showing: this.showing,
          cur: this.currentSymbol(),
          n: this.seq.length,
          prog: this.prog,
          out: this.out,
          w: this.winner,
        };
      },
    };
  },
};
