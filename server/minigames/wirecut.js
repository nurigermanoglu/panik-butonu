'use strict';
// KABLO KESME - kablolardan asagi AKIM kivilcimlari iniyor. Kivilcim makas
// bandina girdigi anda o kabloya dokunup kes.
//
//   dokunmatik / fare -> kabloyu kes (kivilcim bandin icindeyken)
//
// NEDEN BOYLE: eski hali "renk sirasini izle, sonra ezberden kes" idi ve
// Hafiza Dizisi ile AYNI TURDU (13 oyunun ikisi ezber). Ustelik turun
// ucte biri gosterim asamasinda geciyordu - o sure boyunca oyuncunun
// yapacagi hicbir sey yoktu. Ikisi de sikiciydi.
//
// Yeni hali ZAMANLAMA oyunu: hicbir sey gizli degil, hicbir sey
// ezberlenmiyor, ilk saniyeden son saniyeye kadar elin uzerinde.
// Elimizdeki oyunlar arasinda surekli zamanlama isteyen baska oyun yok
// (Refleks Duellosu tek atislik).
//
// PUAN: kesilen kivilcim +1. Kacan kivilcim 0. Bosa dokunus puan
// kaybettirmez ama MAKASI SIKISTIRIR - asil ceza kaybedilen zamandir.
// Boylece "her kabloya surekli dokun" ise yaramaz: sikisik makasla
// siradaki kivilcimi da kacirirsin.
//
// ADALET:
//   - Kivilcim programi tur basinda BIR KEZ uretilir, herkes aynisini oynar.
//   - Iki kivilcimin band penceresi HIC CAKISMAZ ve aralarinda tepki payi
//     birakilir: kusursuz oynayan biri teorik olarak HEPSINI kesebilir.
//     (Engelden Kac'taki "desen her zaman gecilebilir" garantisiyle ayni
//      fikir - kaybetmek sansa degil zamanlamaya bagli olsun.)
//   - Kesme hakki oyuncu basina ayri: kimse kimsenin kivilcimini calmaz.

const { dereceler } = require('./siralama');

const RENKLER = ['#41a6f6', '#ffcd75', '#a7f070', '#b13e53', '#b55088'];
const WIRE_COUNT = 5;
const BAND = 28;             // kablonun dokunma yaricapi (yatayda)
const TOP_Y = 40;            // kablolarin ust ucu (kivilcim buradan cikar)
const BOT_Y = 170;           // kablolarin alt ucu (bomba burada)
const KESME_Y = 116;         // makas bandinin ust kenari
const KESME_H = 34;          // bandin kalinligi -> pencere = KESME_H / hiz
const SIKISMA = 0.5;         // bosa dokununca makasin sikisma suresi (sn)
const DURATION = 14;

const HIZ_BAS = 48;          // ilk kivilcimlarin hizi (birim/sn)
const HIZ_SON = 80;          // son kivilcimlarin hizi
const HIZLANMA = 10;         // kacinci kivilcimda en yuksek hiza cikilir
const ARA = 0.3;             // iki pencere arasinda birakilan tepki payi

// Kivilcim programi. Pencereler (bandda gecirilen sure) cakismaz.
function programUret(sv, sure) {
  const kivilcimlar = [];
  let pencereBas = 1.6;              // ilk pencerenin acilma ani
  let oncekiKablo = -1;

  for (;;) {
    const oran = Math.min(1, kivilcimlar.length / HIZLANMA);
    // Tur ilerledikce ve mac hizlandikca kivilcimlar hizlanir = pencere daralir
    const hiz = (HIZ_BAS + (HIZ_SON - HIZ_BAS) * oran) * (1 + 0.25 * sv);
    const pencere = KESME_H / hiz;
    if (pencereBas + pencere > sure - 0.3) break;

    // Ayni kablodan ard arda gelmesin: elin bir yerde takilip kalmasin
    let w;
    do { w = Math.floor(Math.random() * WIRE_COUNT); } while (w === oncekiKablo);
    oncekiKablo = w;

    // Kivilcimin dogdugu an: bandin ust kenarina pencereBas aninda varmali
    const dogus = pencereBas - (KESME_Y - TOP_Y) / hiz;
    kivilcimlar.push({ w: w, v: hiz, dogus: dogus, girer: pencereBas, cikar: pencereBas + pencere });

    // Bir sonraki pencere, bu pencere kapandiktan sonra + tepki payi
    pencereBas += pencere + ARA * (1 - 0.3 * sv);
  }
  return kivilcimlar;
}

module.exports = {
  id: 'wirecut',
  name: 'KABLO KESME',
  instruction: 'KIVILCIMI BANDDA KES!',
  controls: 'pointer',
  duration: DURATION,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    const sure = DURATION * (1 - 0.15 * sv);
    const kivilcimlar = programUret(sv, sure);

    const wires = [];
    for (let i = 0; i < WIRE_COUNT; i++) wires.push({ x: 40 + i * 56, col: RENKLER[i] });

    const pl = {};
    for (const id of playerIds) {
      pl[id] = { score: 0, kesti: 0, kacti: 0, bosa: 0, pen: 0, kesilen: {}, flash: 0, iyi: true };
    }

    return {
      ids: playerIds.slice(),
      sure,
      wires,
      kivilcimlar,
      pl,
      t: 0,
      kapanan: 0,              // penceresi kapanmis kivilcim sayaci

      // O an EKRANDA olan kivilcimlar (dogmus, henuz bombaya varmamis)
      aktifler() {
        const out = [];
        for (let i = 0; i < this.kivilcimlar.length; i++) {
          const k = this.kivilcimlar[i];
          if (this.t < k.dogus) continue;
          const y = TOP_Y + (this.t - k.dogus) * k.v;
          if (y > BOT_Y) continue;
          out.push({ i: i, w: k.w, y: y, v: k.v });
        }
        return out;
      },

      input(pid, a, d) {
        if (a !== 'grab') return;                  // tek dokunus = kesme denemesi
        const me = this.pl[pid];
        if (!me || !d) return;
        if (me.pen > 0) return;                    // makas sikisik
        const x = Number(d.x), y = Number(d.y);
        if (!isFinite(x) || !isFinite(y)) return;

        // Hangi kabloya dokundu?
        let w = -1;
        for (let i = 0; i < this.wires.length; i++) {
          if (Math.abs(this.wires[i].x - x) <= BAND) { w = i; break; }
        }

        // O kabloda, BANDIN ICINDE, henuz kesmedigim bir kivilcim var mi?
        let hedef = -1;
        if (w >= 0) {
          for (const k of this.aktifler()) {
            if (k.w !== w) continue;
            if (me.kesilen[k.i]) continue;
            if (k.y + 3 < KESME_Y || k.y - 3 > KESME_Y + KESME_H) continue;
            hedef = k.i; break;
          }
        }

        if (hedef >= 0) {
          me.kesilen[hedef] = true;
          me.score++;
          me.kesti++;
          me.flash = 0.2; me.iyi = true;
        } else {
          // Erken/gec dokundu ya da bos kabloya vurdu: makas sikisir.
          // Puan kaybi yok - ceza kaybedilen zaman.
          me.pen = SIKISMA;
          me.bosa++;
          me.flash = 0.3; me.iyi = false;
        }
      },

      update(dt) {
        this.t += dt;

        // Penceresi kapanan kivilcimlar: kesemeyenler icin "kacti"
        while (this.kapanan < this.kivilcimlar.length &&
               this.t > this.kivilcimlar[this.kapanan].cikar) {
          const idx = this.kapanan;
          for (const id of this.ids) {
            if (!this.pl[id].kesilen[idx]) this.pl[id].kacti++;
          }
          this.kapanan++;
        }

        for (const id of this.ids) {
          const me = this.pl[id];
          if (me.pen > 0) me.pen -= dt;
          if (me.flash > 0) me.flash -= dt;
        }
      },

      // ---- bu oyuna ozel bot ----
      // Bot da insan gibi oynar ve zorluk INSANIN ZORLANDIGI yerlerden gelir:
      //   TEPKI   - kivilcimi gorup karar verme suresi
      //   EL_HIZI - elini bir kablodan digerine tasima hizi
      //   NISAN   - bandin ortasini ne kadar hassas tutturdugu
      //
      // Is IKIYE bolunmus:
      //   botHamle -> hangi kivilcimi hedefleyecegine karar verir (seyrek)
      //   botIzle  -> eli varinca DOGRU ANDA keser (her karede)
      // Boyle olmasinin sebebi olculdu: hamle araligi kolay botta 0.44-0.99 sn,
      // bandin penceresi ise 0.43-0.71 sn. Kesme karari da hamle araligina
      // birakilsaydi bot pencereye tesaduf eseri denk gelirdi ve zorluk
      // "ne kadar sik dokunuyor"a inerdi - oysa bu bir ZAMANLAMA oyunu.
      // Insan da boyle oynuyor: once "su kabloya gidiyorum" der, sonra eli
      // dogru anda kapanir.
      //
      // Yalnizca snap ciktisini kullanir: programa (kivilcimlar) bakmaz.
      botNiyet(pid) {
        if (!this.botEl) this.botEl = {};
        return this.botEl[pid] ||
          (this.botEl[pid] = { kablo: 0, varis: 0, hedefI: -1, nisanY: 0, kacirdi: {} });
      },

      // Ortaya en yakin, henuz kesilmemis ve bandi gecmemis kivilcim
      botHedef(pid, snap, me) {
        const el = this.botNiyet(pid);
        const orta = snap.ky + snap.kh / 2;
        let hedef = null, enYakin = Infinity;
        for (const k of snap.k) {
          if (me.kes.indexOf(k.i) >= 0) continue;
          // Bir kez elini yanlis kapattigi kivilcimin pesine dusmez: makas
          // sikisikken o pencere zaten kayboluyor, tekrar denemek insanin
          // yapmayacagi bir sey olurdu.
          if (el.kacirdi[k.i]) continue;
          if (k.y > orta + snap.kh / 2) continue;      // bu kivilcim kacti
          const fark = Math.abs(k.y - orta);
          if (fark < enYakin) { enYakin = fark; hedef = k; }
        }
        return hedef;
      },

      botHamle(pid, snap, zorluk) {
        const me = snap.pl[pid];
        if (!me) return;
        const hedef = this.botHedef(pid, snap, me);
        if (!hedef) return;

        const TEPKI = [0.22, 0.14, 0.06];           // saniye
        const EL_HIZI = [6, 10, 20];                 // kablo/sn
        // Zamanlama gurultusu: bandin YARISININ orani olarak. 1'den buyuk
        // deger nisan noktasinin bandin DISINA dusebilecegi anlamina gelir -
        // yani makas sikisir. Zor bota da kucuk bir pay birakildi: kusursuz
        // olsaydi insan onu en fazla berabere tutabilirdi.
        const GURULTU = [1.8, 1.35, 1.15];
        const tepki = TEPKI[zorluk] !== undefined ? TEPKI[zorluk] : TEPKI[1];
        const elHizi = EL_HIZI[zorluk] !== undefined ? EL_HIZI[zorluk] : EL_HIZI[1];
        const gurultu = GURULTU[zorluk] !== undefined ? GURULTU[zorluk] : GURULTU[1];

        const el = this.botNiyet(pid);
        if (el.hedefI !== hedef.i) {
          // Yeni hedef: eli o kabloya tasimak + gorup karar vermek zaman alir
          el.varis = this.t + Math.abs(hedef.w - el.kablo) / elHizi + tepki;
          el.kablo = hedef.w;
          el.hedefI = hedef.i;
          // Makasi kapatmayi hedefledigi Y. Bandin disina duserse sikisir.
          const orta = snap.ky + snap.kh / 2;
          el.nisanY = orta + (Math.random() * 2 - 1) * gurultu * (snap.kh / 2);
        }
      },

      botIzle(pid, snap) {
        const me = snap.pl[pid];
        if (!me || me.pen > 0) return;              // makas sikisik
        if (!this.botEl || !this.botEl[pid]) return;
        const el = this.botEl[pid];
        if (el.hedefI < 0 || this.t < el.varis) return;   // el henuz varmadi

        const hedef = snap.k.find((k) => k.i === el.hedefI);
        if (!hedef || me.kes.indexOf(hedef.i) >= 0) return;

        // Kivilcim nisan noktasina ULASTIGI an makasi kapat. Kivilcim hep
        // asagi indigi icin bu kosul her hedef icin tam bir kez saglanir.
        if (hedef.y < el.nisanY) return;

        const no = el.hedefI;
        el.hedefI = -1;                              // bu kivilcim icin is bitti
        this.input(pid, 'grab', { x: snap.wires[hedef.w].x, y: hedef.y });
        // Sikistiysa bu kivilcimi kaybetti sayilir
        if (this.pl[pid] && this.pl[pid].pen > 0) el.kacirdi[no] = true;
      },

      done() { return false; },                    // sure dolana kadar surer

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
        if (!w.length) return { k: 'sonuc.wirecut.kimse' };
        const me = this.pl[w[0]];
        const p = { n: me.kesti, t: this.kivilcimlar.length, s: me.bosa };
        return me.bosa
          ? { k: 'sonuc.wirecut.skorSikisma', p: p }
          : { k: 'sonuc.wirecut.skor', p: p };
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          // Sadece EKRANDAKI kivilcimlar icin "bunu kestim" bilgisi gerekiyor
          const kes = [];
          for (const k of this.aktifler()) if (me.kesilen[k.i]) kes.push(k.i);
          pl[id] = {
            s: me.score,
            pen: me.pen > 0 ? Math.round(me.pen * 100) / 100 : 0,
            fl: me.flash > 0 ? (me.iyi ? 1 : 2) : 0,
            kes: kes,
          };
        }
        return {
          top: TOP_Y, bot: BOT_Y, band: BAND,
          ky: KESME_Y, kh: KESME_H,
          wires: this.wires,
          n: this.kivilcimlar.length,
          // v = hiz: istemci paketler arasinda kivilcimi suzerek akici cizer
          k: this.aktifler().map((k) => ({
            i: k.i, w: k.w, y: Math.round(k.y * 10) / 10, v: Math.round(k.v),
          })),
          pl: pl,
        };
      },
    };
  },
};
