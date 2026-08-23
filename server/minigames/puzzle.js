'use strict';
// PUZZLE - 4x4 elma resminin eksik 3 karesini alttaki parcalardan bulup dogru yuvaya tak.
//
// Resim (2 elmadan biri), hangi 3 karenin eksik oldugu ve parca sirasi bir kez uretilir;
// HERKES ayni bulmacayi oynar. Ilerleme oyuncu basina ayri tutulur.

const { dereceler } = require('./siralama');
const COLS = 4, ROWS = 4;
const CW = 30, CH = 34;                  // hucre boyutu (resim orani ~0.90 korunur)
const GX = 20, GY = 32;                  // izgara sol ust kosesi (resim solda, buyuk)
// Bekleyen parcalar sagda dikey dizilir - boylece resme daha fazla yer kalir
const PIECE_POS = [{ x: 252, y: 56 }, { x: 252, y: 104 }, { x: 252, y: 152 }];
const MISSING = 3;
const GRAB_R = 18;
const DROP_R = 20;
const DURATION = 14;
const IMAGE_COUNT = 2;

// Eksik kare olarak sadece resmin DOLU kismindaki kareler secilir; boylece her parca
// gorsel olarak ayirt edilebilir ve tek bir dogru yuvasi olur.
// (Iki resim icin de %85+ dolu olan hucreler olculdu.)
const CANDIDATES = [2, 5, 6, 7, 8, 9, 10, 11, 13, 14];

function karistir(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}

// Resim secimi de "torba" ile: her resim tekrar etmeden birer kez gelir, sonra torba yenilenir.
// Rastgele secimde ust uste ayni resim gelip "digeri hic cikmiyor" hissi olusabiliyordu.
//
// Torba ODA BASINA tutulur: gameLoop her odaya ait 'hafiza' nesnesini geciriyor.
// Modul seviyesinde tutuldugunda ayni anda oynayan butun odalar tek torbayi
// paylasiyor ve "sirayla gelsin" garantisi bozuluyordu.
function sonrakiResim(hafiza) {
  let torba = hafiza.puzzleResim;
  if (!torba || !torba.length) {
    torba = [];
    for (let i = 0; i < IMAGE_COUNT; i++) torba.push(i);
    for (let i = torba.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = torba[i]; torba[i] = torba[j]; torba[j] = t;
    }
    hafiza.puzzleResim = torba;
  }
  return torba.shift();
}

function cellCenter(i) {
  const c = i % COLS, r = Math.floor(i / COLS);
  return { x: GX + c * CW + CW / 2, y: GY + r * CH + CH / 2 };
}

module.exports = {
  id: 'puzzle',
  name: 'PUZZLE',
  instruction: 'EKSIK PARCALARI TAK!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds, seviye, hafiza) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    // Parca sayisi ekrandaki 3 yuvaya sabit; hizlanma sureyi kisaltarak olur
    const sure = DURATION * (1 - 0.28 * sv);

    const img = sonrakiResim(hafiza || {});
    const eksik = karistir(CANDIDATES).slice(0, MISSING);
    const parcaSirasi = karistir(eksik);

    const pl = {};
    for (const id of playerIds) {
      pl[id] = {
        pieces: parcaSirasi.map((cellIdx, i) => ({
          cell: cellIdx, x: PIECE_POS[i].x, y: PIECE_POS[i].y,
          hx: PIECE_POS[i].x, hy: PIECE_POS[i].y, st: 0,
        })),
        held: -1, score: 0, lastAt: sure, flash: 0, good: true,
      };
    }

    return {
      ids: playerIds.slice(),
      sure,
      img,
      eksik,
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
          for (let i = 0; i < me.pieces.length; i++) {
            const q = me.pieces[i];
            if (q.st !== 0) continue;
            const dx = q.x - x, dy = q.y - y, dd = dx * dx + dy * dy;
            if (dd <= bestD) { bestD = dd; best = i; }
          }
          if (best >= 0) {
            me.pieces[best].st = 1;
            me.pieces[best].x = x; me.pieces[best].y = y;
            me.held = best;
          }
          return;
        }

        if (a === 'drag') {
          if (me.held < 0) return;
          me.pieces[me.held].x = x;
          me.pieces[me.held].y = y;
          return;
        }

        if (a === 'drop') {
          if (me.held < 0) return;
          const q = me.pieces[me.held];
          me.held = -1;

          let hedef = -1;
          for (const ci of this.eksik) {
            if (me.pieces.some((p) => p.st === 2 && p.cell === ci)) continue;   // yuva dolu
            const c = cellCenter(ci);
            const dx = c.x - x, dy = c.y - y;
            if (dx * dx + dy * dy <= DROP_R * DROP_R) { hedef = ci; break; }
          }

          if (hedef >= 0 && hedef === q.cell) {
            const c = cellCenter(hedef);
            q.st = 2; q.x = c.x; q.y = c.y;
            me.score++;
            me.lastAt = this.t;
            me.flash = 0.2; me.good = true;
          } else {
            q.st = 0;
            q.x = q.hx; q.y = q.hy;
            if (hedef >= 0) { me.flash = 0.3; me.good = false; }
          }
        }
      },

      update(dt) {
        this.t += dt;
        for (const id of this.ids) if (this.pl[id].flash > 0) this.pl[id].flash -= dt;
      },

      done() {
        return this.ids.every((id) => this.pl[id].score >= MISSING);
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
        return s >= MISSING ? 'PUZZLE TAMAM!' : s + ' / ' + MISSING + ' PARCA';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          pl[id] = {
            s: me.score, h: me.held, fl: me.flash > 0 ? (me.good ? 1 : 2) : 0,
            p: me.pieces.map((q) => ({
              c: q.cell, x: Math.round(q.x), y: Math.round(q.y), st: q.st,
            })),
          };
        }
        return {
          img: this.img,
          cols: COLS, rows: ROWS, cw: CW, ch: CH, gx: GX, gy: GY,
          total: MISSING, miss: this.eksik, pl,
        };
      },
    };
  },
};
