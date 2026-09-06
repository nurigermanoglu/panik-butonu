'use strict';
// DOSYA SILME - klasorleri surukleyip cop kutusuna at. Hepsini en hizli silen kazanir.
//
// Dosya duzeni bir kez uretilir, HERKES ayni duzeni oynar. Her oyuncunun dosyalari ayri takip edilir.

// Dosyalar solda 4x3 izgarada, cop kutusu sagda
const SLOTS = [];
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 4; c++) {
    SLOTS.push({ x: 36 + c * 50, y: 56 + r * 46 });
  }
}

const { dereceler } = require('./siralama');
const { elHazir } = require('./elhizi');
const TRASH = { x: 244, y: 88, w: 58, h: 70 };   // birakma bolgesi (comert)
const FILE_W = 30, FILE_H = 24;
const FILE_COUNT = 7;
const GRAB_R = 22;
const DURATION = 12;
// Cop kutusu tek ve belli: surukleme disinda dusunulecek bir sey yok.
const DUSUNME = 0;

module.exports = {
  id: 'filedelete',
  name: 'DOSYA SILME',
  instruction: 'DOSYALARI COPE AT!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    // Turlar ilerledikce daha cok dosya (7 -> 10) ve biraz daha kisa sure
    const adet = Math.min(SLOTS.length, FILE_COUNT + Math.round(3 * sv));
    const sure = DURATION * (1 - 0.15 * sv);

    // 12 slottan "adet" tanesini sec (herkes icin ayni)
    const idx = SLOTS.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    const sablon = idx.slice(0, adet).map((si) => ({ hx: SLOTS[si].x, hy: SLOTS[si].y }));

    const pl = {};
    for (const id of playerIds) {
      pl[id] = {
        files: sablon.map((s) => ({ x: s.hx, y: s.hy, hx: s.hx, hy: s.hy, st: 0 })),
        held: -1, score: 0, lastAt: sure, flash: 0,
      };
    }

    return {
      ids: playerIds.slice(),
      adet, sure,
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
          for (let i = 0; i < me.files.length; i++) {
            const fl = me.files[i];
            if (fl.st !== 0) continue;
            const dx = fl.x - x, dy = fl.y - y, dd = dx * dx + dy * dy;
            if (dd <= bestD) { bestD = dd; best = i; }
          }
          if (best >= 0) {
            me.files[best].st = 1;
            me.files[best].x = x; me.files[best].y = y;
            me.held = best;
          }
          return;
        }

        if (a === 'drag') {
          if (me.held < 0) return;
          me.files[me.held].x = x;
          me.files[me.held].y = y;
          return;
        }

        if (a === 'drop') {
          if (me.held < 0) return;
          const fl = me.files[me.held];
          me.held = -1;

          const copte = x >= TRASH.x && x <= TRASH.x + TRASH.w &&
                        y >= TRASH.y && y <= TRASH.y + TRASH.h;
          if (copte) {
            fl.st = 2;
            me.score++;
            me.lastAt = this.t;
            me.flash = 0.2;
          } else {
            fl.st = 0;
            fl.x = fl.hx; fl.y = fl.hy;
          }
        }
      },

      update(dt) {
        this.t += dt;
        for (const id of this.ids) if (this.pl[id].flash > 0) this.pl[id].flash -= dt;
      },

      // ---- bu oyuna ozel bot ----
      // Genel isaretci botu rastgele bir noktaya dokunup cope birakmayi
      // deniyordu: cogu dokunusta elinde dosya olmuyordu (olculdu: zor bot
      // 7 dosyanin ancak 6.2'sini siliyordu ve suresi hep tavanda kaliyordu).
      //
      // Bu bot silinmemis en yakin dosyayi alip cop kutusuna birakir.
      // Tek hamlede al-birak yapmasi kasitli: insanin bir surukleme hareketi
      // de tek eylemdir, sureyi belirleyen hamleler ARASINDAKI bekleme.
      //
      // Yalnizca snap ciktisini kullanir - istemcinin de gordugu bilgiyi.
      botHamle(pid, snap, zorluk) {
        const me = snap.pl[pid];
        if (!me) return;
        // Her surukleme bir insan eli suresi harcar (bkz. elhizi.js)
        if (!elHazir(this, pid, zorluk, DUSUNME)) return;

        const kalanlar = [];
        for (let i = 0; i < me.f.length; i++) if (me.f[i].st === 0) kalanlar.push(me.f[i]);
        if (!kalanlar.length) return;

        // Cop kutusunun ortasi
        const cx = snap.trash.x + snap.trash.w / 2;
        const cy = snap.trash.y + snap.trash.h / 2;

        // Cope en yakin dosyadan basla: toplam surukleme yolu kisalir
        let hedef = kalanlar[0], enYakin = Infinity;
        for (const fl of kalanlar) {
          const dx = fl.x - cx, dy = fl.y - cy, dd = dx * dx + dy * dy;
          if (dd < enYakin) { enYakin = dd; hedef = fl; }
        }

        // Zorluk = elinin ne kadar titredigi. Kolay bot dosyayi kaciriyor
        // ya da cop kutusunun disina birakiyor.
        const SAPMA = [20, 7, 0];       // piksel (yakalama yaricapi 22)
        const sapma = SAPMA[zorluk] !== undefined ? SAPMA[zorluk] : SAPMA[1];
        const kay = () => (Math.random() * 2 - 1) * sapma;

        this.input(pid, 'grab', { x: hedef.x + kay(), y: hedef.y + kay() });
        this.input(pid, 'drop', { x: cx + kay(), y: cy + kay() });
      },

      // Herkes butun dosyalarini sildiyse tur erken bitsin
      done() {
        return this.ids.every((id) => this.pl[id].score >= this.adet);
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
        if (!w.length) return { k: 'sonuc.berabere' };
        const s = this.pl[w[0]].score;
        return s >= this.adet
          ? { k: 'sonuc.filedelete.hepsi' }
          : { k: 'sonuc.filedelete.kismi', p: { n: s, t: this.adet } };
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          pl[id] = {
            s: me.score, h: me.held, fl: me.flash > 0 ? 1 : 0,
            f: me.files.map((q) => ({ x: Math.round(q.x), y: Math.round(q.y), st: q.st })),
          };
        }
        return { trash: TRASH, fw: FILE_W, fh: FILE_H, total: this.adet, pl };
      },
    };
  },
};
