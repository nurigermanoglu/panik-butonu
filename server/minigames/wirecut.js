'use strict';
// KABLO KESME - ustte gosterilen sirayla kablolari kes. Yanlis kabloya dokunursan makas sikisir.
//
// Kablo renkleri ve kesim sirasi bir kez uretilir, HERKES aynisini oynar.
// Her oyuncunun ilerlemesi ve cezasi ayri takip edilir. Sirayi ilk bitiren kazanir.

const RENKLER = ['#41a6f6', '#ffcd75', '#a7f070', '#b13e53', '#b55088'];
const WIRE_COUNT = 5;
const BAND = 28;           // kablonun dokunma yaricapi (yatayda)
const PENALTY = 1.2;       // makas sikisma cezasi (saniye)
const DURATION = 14;
const TOP_Y = 46;          // kablolarin ust ucu
const BOT_Y = 168;         // kablolarin alt ucu

module.exports = {
  id: 'wirecut',
  name: 'KABLO KESME',
  instruction: 'DOGRU SIRAYLA KES!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds) {
    // kablo konumlari
    const wires = [];
    for (let i = 0; i < WIRE_COUNT; i++) {
      wires.push({ x: 40 + i * 56, col: RENKLER[i] });
    }
    // kesim sirasi: karistirilmis permutasyon (herkes icin ayni)
    const order = wires.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }

    const pl = {};
    for (const id of playerIds) {
      pl[id] = { prog: 0, pen: 0, cut: [], bitAt: DURATION + 1 };
    }

    return {
      ids: playerIds.slice(),
      wires,
      order,
      pl,
      t: 0,

      input(pid, a, d) {
        if (a !== 'grab') return;                 // tek dokunus = kesme denemesi
        const me = this.pl[pid];
        if (!me || !d) return;
        if (me.pen > 0) return;                   // makas sikisik
        if (me.prog >= this.order.length) return;
        const x = Number(d.x), y = Number(d.y);
        if (!isFinite(x) || !isFinite(y)) return;
        if (y < TOP_Y - 10 || y > BOT_Y + 10) return;

        // hangi kabloya dokundu
        let w = -1;
        for (let i = 0; i < this.wires.length; i++) {
          if (Math.abs(this.wires[i].x - x) <= BAND) { w = i; break; }
        }
        if (w < 0) return;
        if (me.cut.indexOf(w) >= 0) return;       // zaten kesilmis

        if (w === this.order[me.prog]) {
          me.cut.push(w);
          me.prog++;
          if (me.prog >= this.order.length) me.bitAt = this.t;
        } else {
          me.pen = PENALTY;                       // yanlis kablo: makas sikisti
        }
      },

      update(dt) {
        this.t += dt;
        for (const id of this.ids) {
          if (this.pl[id].pen > 0) this.pl[id].pen -= dt;
        }
      },

      // biri sirayi tamamladiysa tur biter
      done() {
        return this.ids.some((id) => this.pl[id].prog >= this.order.length);
      },

      winners() {
        const bitiren = this.ids.filter((id) => this.pl[id].prog >= this.order.length);
        if (bitiren.length) {
          const enHizli = Math.min(...bitiren.map((id) => this.pl[id].bitAt));
          const top = bitiren.filter((id) => this.pl[id].bitAt <= enHizli + 1e-6);
          return top.length === this.ids.length ? [] : top;
        }
        const best = Math.max(...this.ids.map((id) => this.pl[id].prog));
        if (best <= 0) return [];
        const top2 = this.ids.filter((id) => this.pl[id].prog === best);
        return top2.length === this.ids.length ? [] : top2;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'KIMSE BITIREMEDI!';
        if (this.pl[w[0]].prog >= this.order.length) return 'BOMBA ETKISIZ!';
        return this.pl[w[0]].prog + ' / ' + this.order.length + ' KABLO';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          pl[id] = {
            p: me.prog,
            pen: me.pen > 0 ? Math.round(me.pen * 10) / 10 : 0,
            cut: me.cut.slice(),
          };
        }
        return {
          top: TOP_Y, bot: BOT_Y, band: BAND,
          wires: this.wires,
          order: this.order.map((i) => this.wires[i].col),   // hedef sira: renkler
          n: this.order.length,
          pl,
        };
      },
    };
  },
};
