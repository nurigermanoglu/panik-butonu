'use strict';
// KABLO KESME - once renk sirasi tek tek gosterilir, sonra kablolar acilir ve
// sira EZBERDEN kesilir. Yanlis kabloya dokunursan makas sikisir.
//
// Tur iki asamalidir:
//   1) GOSTERIM  - kablolar gorunmez; renkler sirayla ekranda belirir
//   2) KESME     - kablolar acilir, ezberlenen sirayla kesilir
//
// Yanlis kablo = makas sikisir VE panel BASA SARAR: kesilenler onarilir, sira
// bastan baslar. Boylece deneme yanilma ile cozmek anlamsizlasir, sirayi
// gercekten ezberleyen kazanir.
//
// Kablo renkleri ve kesim sirasi bir kez uretilir, HERKES aynisini oynar.
// Her oyuncunun ilerlemesi ve cezasi ayri takip edilir. Sirayi ilk bitiren kazanir.
//
// ONEMLI: sira istemciye HICBIR ZAMAN toplu gonderilmez - snap yalnizca O AN
// gosterilen rengi tasir. Yoksa oyunu bilen biri konsoldan cevabi okuyabilirdi
// ve ezberlemenin bir anlami kalmazdi.

const RENKLER = ['#41a6f6', '#ffcd75', '#a7f070', '#b13e53', '#b55088'];
const WIRE_COUNT = 5;
const BAND = 28;           // kablonun dokunma yaricapi (yatayda)
const PENALTY = 1.2;       // makas sikisma cezasi (saniye)
const CUT_TIME = 9;        // kablolar acildiktan SONRAKI kesme suresi
const LEAD_IN = 0.6;       // gosterim baslamadan once bekleme
const ON_TIME = 0.55;      // her rengin ekranda kalma suresi
const OFF_TIME = 0.25;     // renkler arasi bosluk
const TOP_Y = 46;          // kablolarin ust ucu
const BOT_Y = 168;         // kablolarin alt ucu

module.exports = {
  id: 'wirecut',
  name: 'KABLO KESME',
  instruction: 'SIRAYI EZBERLE!',
  controls: 'pointer',
  duration: LEAD_IN + WIRE_COUNT * (ON_TIME + OFF_TIME) + CUT_TIME,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    // Turlar ilerledikce: gosterim hizlanir (%35'e kadar), kesme suresi kisalir
    // ve yanlis kesince makasin sikisma cezasi agirlasir.
    const on = ON_TIME * (1 - 0.35 * sv);
    const off = OFF_TIME * (1 - 0.35 * sv);
    const gosterim = LEAD_IN + WIRE_COUNT * (on + off);
    // Kesme suresi gosterimin USTUNE eklenir: ezberleme asamasi, kesmeye
    // ayrilan zamandan calmaz.
    const sure = gosterim + CUT_TIME * (1 - 0.25 * sv);
    const ceza = PENALTY * (1 + 0.4 * sv);

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
      // enIyi: basa sarmalar prog'u sifirladigi icin "en cok nereye kadar geldi"
      //        ayri tutulur - kimse bitiremezse kazanan buna gore secilir.
      // sifir: kac kez basa sardi (ekranda gosterilir)
      pl[id] = { prog: 0, enIyi: 0, pen: 0, cut: [], bitAt: sure + 1, sifir: 0 };
    }

    return {
      ids: playerIds.slice(),
      sure, ceza,
      wires,
      order,
      pl,
      t: 0,
      on, off, gosterim,
      showing: true,

      // Gosterim sirasinda kacinci rengin ekranda oldugu (-1 = bosluk ani)
      gosterilen() {
        if (!this.showing) return -1;
        const rel = this.t - LEAD_IN;
        if (rel < 0) return -1;
        const adim = this.on + this.off;
        const idx = Math.floor(rel / adim);
        if (idx >= this.order.length) return -1;
        return rel - idx * adim <= this.on ? idx : -1;
      },

      input(pid, a, d) {
        if (a !== 'grab') return;                 // tek dokunus = kesme denemesi
        if (this.showing) return;                 // once ezberle, sonra kes
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
          if (me.prog > me.enIyi) me.enIyi = me.prog;
          if (me.prog >= this.order.length) me.bitAt = this.t;
        } else {
          // Yanlis kablo: makas sikisir ve sira BASA SARAR.
          // Kesilenler onarilir - yoksa kesilmis kablolar tekrar kesilemedigi
          // icin sira bir daha tamamlanamazdi.
          me.pen = this.ceza;
          me.prog = 0;
          me.cut = [];
          me.sifir++;
        }
      },

      update(dt) {
        this.t += dt;
        if (this.showing && this.t >= this.gosterim) this.showing = false;
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
        // Basa sarma prog'u sifirladigi icin anlik degere bakilamaz: son anda
        // yanlis kesen herkes 0'da kalir ve tur haksiz yere berabere biterdi.
        const best = Math.max(...this.ids.map((id) => this.pl[id].enIyi));
        if (best <= 0) return [];
        const top2 = this.ids.filter((id) => this.pl[id].enIyi === best);
        return top2.length === this.ids.length ? [] : top2;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'KIMSE BITIREMEDI!';
        if (this.pl[w[0]].prog >= this.order.length) return 'BOMBA ETKISIZ!';
        return this.pl[w[0]].enIyi + ' / ' + this.order.length + ' KABLO';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          pl[id] = {
            p: me.prog,
            en: me.enIyi,
            sifir: me.sifir,
            pen: me.pen > 0 ? Math.round(me.pen * 10) / 10 : 0,
            cut: me.cut.slice(),
          };
        }
        const gi = this.gosterilen();
        return {
          top: TOP_Y, bot: BOT_Y, band: BAND,
          wires: this.wires,
          n: this.order.length,
          showing: this.showing,
          // Sadece su an gosterilen renk gider; butun sira asla istemciye gitmez.
          cur: gi >= 0 ? this.wires[this.order[gi]].col : null,
          curIdx: gi,                                  // kacinci renk (0 tabanli)
          pl,
        };
      },
    };
  },
};
