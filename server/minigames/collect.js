'use strict';
// DUSENLERI YAKALA - yukaridan dusen yildizlari topla, bombalardan kac.
//
//   sol / sag  -> serit degistir  (her basis TEK serit, Engelden Kac gibi)
//
// HERKES AYNI SAHADA oynar: ayni serit dizisi, ayni dusen esyalar. Bir esyayi
// o serittekilerin HEPSI alir - kimse kimsenin puanini calmaz, herkes kendi
// tahminiyle yarisir. (Tek kisiye verilseydi "once kim geldi" sorusu ping'e
// bagli olurdu ve uzaktan oynayan haksizliga ugrardi.)
//
// Dusme programi bir kez uretilir, herkes aynisini oynar. Ayni anda en fazla
// 2 esya duser ve ikisi ayni seritte olmaz; 5 serit oldugu icin bombadan
// kacacak yer HER ZAMAN vardir.
//
// Puan: yildiz +1, bomba -2. Engelden Kac'in tersi - kacmak degil yakalamak.

const { dereceler } = require('./siralama');

const LANES = 5;
const DURATION = 13;
const UST_Y = 28;            // esyalarin ciktigi yukseklik
const YAKALA_Y = 148;        // oyuncunun hizasi (yakalama cizgisi)
const ALT_Y = 180;           // bu cizgiyi gecen esya silinir
const DUSME_HIZI = 108;      // birim/sn
const BOMBA_ORANI = 0.26;
const BOMBA_CEZA = 2;
// Oyuncular farkli seritlerden baslar: ortadan disa dogru dagilir
const BASLANGIC = [2, 0, 4, 1];

function programUret(sv, sure) {
  const hiz = DUSME_HIZI * (1 + 0.35 * sv);
  const plan = [];
  let t = 0.5;

  while (t < sure - 0.2) {
    const oran = Math.min(1, t / sure);
    // Tur ilerledikce hem siklasir hem ayni anda iki esya dusme ihtimali artar
    const ara = (0.6 - 0.2 * oran) * (1 - 0.3 * sv);
    const adet = Math.random() < 0.3 + 0.3 * oran ? 2 : 1;

    const kullanilan = [];
    for (let i = 0; i < adet; i++) {
      // Ayni anda ayni serite iki esya dusmesin
      const bos = [];
      for (let l = 0; l < LANES; l++) if (kullanilan.indexOf(l) < 0) bos.push(l);
      const lane = bos[Math.floor(Math.random() * bos.length)];
      kullanilan.push(lane);
      plan.push({ t: t, lane: lane, bomba: Math.random() < BOMBA_ORANI, v: hiz });
    }
    t += Math.max(0.22, ara);
  }
  return plan;
}

module.exports = {
  id: 'collect',
  name: 'DUSENLERI YAKALA',
  instruction: 'YILDIZLARI TOPLA!',
  controls: 'lr',
  duration: DURATION,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    const sure = DURATION * (1 - 0.15 * sv);
    const plan = programUret(sv, sure);

    const pl = {};
    playerIds.forEach((id, i) => {
      pl[id] = {
        lane: BASLANGIC[i % BASLANGIC.length],
        score: 0, flash: 0, good: true, yildiz: 0, bomba: 0,
      };
    });

    return {
      ids: playerIds.slice(),
      lanes: LANES,
      sure,
      plan,
      pl,
      items: [],
      sirada: 0,
      t: 0,

      input(pid, a, d) {
        if (a !== 'dir') return;
        const me = this.pl[pid];
        if (!me) return;
        if (d === 'left') me.lane = Math.max(0, me.lane - 1);
        else if (d === 'right') me.lane = Math.min(LANES - 1, me.lane + 1);
      },

      update(dt) {
        this.t += dt;

        // Zamani gelen esyalari sahaya al
        while (this.sirada < this.plan.length && this.plan[this.sirada].t <= this.t) {
          const p = this.plan[this.sirada++];
          this.items.push({ lane: p.lane, bomba: p.bomba, y: UST_Y, v: p.v });
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
          const it = this.items[i];
          const onceki = it.y;
          it.y += it.v * dt;

          // Yakalama cizgisini bu karede gecti mi?
          if (onceki < YAKALA_Y && it.y >= YAKALA_Y) {
            for (const id of this.ids) {
              const me = this.pl[id];
              if (me.lane !== it.lane) continue;
              if (it.bomba) {
                me.score -= BOMBA_CEZA;
                me.bomba++;
                me.flash = 0.3; me.good = false;
              } else {
                me.score += 1;
                me.yildiz++;
                me.flash = 0.2; me.good = true;
              }
            }
            it.alindi = true;                 // istemci carpma efekti cizsin
          }

          if (it.y > ALT_Y) this.items.splice(i, 1);
        }

        for (const id of this.ids) {
          if (this.pl[id].flash > 0) this.pl[id].flash -= dt;
        }
      },

      done() { return false; },               // sure dolana kadar surer

      // Skor yuksek olan onde; bomba cezasi skoru dusurur.
      derece() {
        return dereceler(this.ids, (id) => -this.pl[id].score);
      },

      winners() {
        const best = Math.max(...this.ids.map((id) => this.pl[id].score));
        if (best <= 0) return [];
        const top = this.ids.filter((id) => this.pl[id].score === best);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        const w = this.winners();
        if (!w.length) return 'KIMSE TOPLAYAMADI!';
        const me = this.pl[w[0]];
        return me.yildiz + ' YILDIZ!' + (me.bomba ? ' (' + me.bomba + ' BOMBA)' : '');
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          pl[id] = {
            l: me.lane,
            s: me.score,
            fl: me.flash > 0 ? (me.good ? 1 : 2) : 0,
          };
        }
        return {
          lanes: LANES, ust: UST_Y, yak: YAKALA_Y,
          // v = hiz: istemci paketler arasinda konumu suzerek akici cizer
          items: this.items.map((it) => ({
            l: it.lane, y: Math.round(it.y * 10) / 10, b: it.bomba, v: Math.round(it.v),
          })),
          pl: pl,
        };
      },
    };
  },
};
