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

      // ---- bu oyuna ozel bot ----
      // Genel bot rastgele serit degistirdigi icin yildizlari nadiren
      // yakaliyordu (olculdu: zorluk ne olursa olsun ~1.3 puan). Buradaki bot
      // dusen esyalari takip eder, bombadan kacar.
      //
      // Yalnizca snap ciktisini kullanir - yani istemcinin de gordugu bilgiyi.
      // Oyunun ic degiskenlerine (plan, sirada...) bakmaz.
      botHamle(pid, snap, zorluk) {
        const me = snap.pl[pid];
        if (!me) return;

        // Zor bot her zaman dogru karar verir, kolay bot sik sik sasirir.
        const ISABET = [0.5, 0.8, 1];
        const isabet = ISABET[zorluk] !== undefined ? ISABET[zorluk] : 0.8;
        if (Math.random() > isabet) {
          this.input(pid, 'dir', Math.random() < 0.5 ? 'left' : 'right');
          return;
        }

        // Bir esyanin yakalama cizgisine inmesine kalan sure
        const varis = (it) => (snap.yak - it.y) / Math.max(1, it.v);
        // Serit degisimi bu oyunda ANLIK (kayma yok); harcanan sure botun
        // iki hamlesi arasindaki bekleme. Zor bot daha sik hamle yaptigi
        // icin daha uzaktaki yildiza da yetisir - sabit 0.3 sn varsayimi
        // onu gereksiz yere temkinli yapiyordu.
        const SERIT = [0.35, 0.2, 0.09];
        const SERIT_SURE = SERIT[zorluk] !== undefined ? SERIT[zorluk] : 0.2;
        const TEHLIKE = 1.1;         // bu sure icinde inen bomba tehlikeli sayilir

        const bombaVar = (lane) => snap.items.some((it) => {
          if (!it.b || it.l !== lane) return false;
          const s = varis(it);
          return s > 0 && s < TEHLIKE;
        });

        // 1) Ulasabilecegim en yakin yildizi hedefle
        let hedef = -1, enYakin = Infinity;
        for (const it of snap.items) {
          if (it.b) continue;
          const s = varis(it);
          if (s <= 0) continue;
          // Yetisemeyecegim yildizin pesinden kosmak bosuna
          if (Math.abs(it.l - me.l) * SERIT_SURE > s) continue;
          // Uzerine bomba dusen serite gitmenin anlami yok
          if (bombaVar(it.l)) continue;
          if (s < enYakin) { enYakin = s; hedef = it.l; }
        }

        // 2) Durdugum seride bomba iniyorsa kacmak yildizdan onceliklidir
        if (bombaVar(me.l) && (hedef < 0 || hedef === me.l)) {
          if (me.l > 0 && !bombaVar(me.l - 1)) hedef = me.l - 1;
          else if (me.l < snap.lanes - 1 && !bombaVar(me.l + 1)) hedef = me.l + 1;
        }

        if (hedef < 0 || hedef === me.l) return;
        this.input(pid, 'dir', hedef < me.l ? 'left' : 'right');
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
