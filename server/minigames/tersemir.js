'use strict';
// TERS EMIR - ekranda bir yon yazar, ama yazi KIRMIZIYSA tersine basacaksin.
//
//   yon tuslari (dpad) -> emri cevapla
//
// Elimizdeki 12 oyunun hicbiri bu turden degil: refleks degil (dusunmeden
// basarsan yanarsin), ezber degil (her sey ekranda duruyor). Zorluk tamamen
// OKUDUGUNU TERSINE CEVIRME isinde - psikolojideki Stroop etkisi. Insan
// "SOL" yazisini okuyunca eli kendiliginden sola gider; kirmizi oldugunu
// fark edip durdurmak fazladan bir islem gerektirir ve hizlandikca sasirtir.
//
// PUAN: dogru +1, yanlis -1, cevapsiz 0.
// Yanlisin cezali, bos gecmenin cezasiz olmasi bilerek boyle: emin degilsen
// ELINI CEKMEK gecerli bir strateji olsun istiyoruz. Yine de hic oynamayan
// 0'da kalir, oynayan onu gecer - yani pasiflik kazandirmaz.
//
// ADALET: emirler tur basinda BIR KEZ uretilir ve herkes ayni sirayi ayni
// anda gorur. Oyun sirasinda hicbir rastgelelik yok; kimsenin ekraninda
// baskasindan farkli bir sey olmaz. Gelecek emirler istemciye HIC
// gonderilmez (bkz. snap) - yalnizca o an ekranda olan yollanir.

const { dereceler } = require('./siralama');

const DURATION = 14;

const AD = { left: 'SOL', right: 'SAG', up: 'YUKARI', down: 'ASAGI' };
const TERSI = { left: 'right', right: 'left', up: 'down', down: 'up' };
const YONLER = ['left', 'right', 'up', 'down'];

// Pencere insan olcusune gore secildi: bir kelimeyi okuyup TERSINE cevirmek
// (Stroop) duz okumaya gore ~300 ms fazla surer. En dar pencere bile
// 1.05 x 0.78 = 0.82 sn kalir - dar ama sansa kalmaz.
const PENCERE_BAS = 1.5;     // ilk emirlerin cevap suresi (sn)
const PENCERE_SON = 1.05;    // son emirlerin cevap suresi
const ARA = 0.28;            // emirler arasi bosluk ("simdi ne gelecek?")
const HIZLANMA = 10;         // kacinci emirde en dar pencereye inilir
const TERS_ORAN = 0.42;

// Emir listesi. Tur basinda bir kez uretilir; update sirasinda hicbir
// rastgelelik calismaz.
function emirlerUret(sv, sure) {
  const emirler = [];
  let t = 0.7;                                  // ilk emre kadar hazirlik payi
  let oncekiYon = null;
  let ustUsteTers = 0;

  for (;;) {
    const oran = Math.min(1, emirler.length / HIZLANMA);
    // Tur ilerledikce pencere daralir; seviye (mac ilerledikce) ayrica daraltir
    const pencere = (PENCERE_BAS - (PENCERE_BAS - PENCERE_SON) * oran) * (1 - 0.22 * sv);
    if (t + pencere > sure) break;

    // Ayni yon ard arda gelmesin: "gene ayni" hissi vermesin
    let yon;
    do { yon = YONLER[Math.floor(Math.random() * YONLER.length)]; }
    while (yon === oncekiYon);
    oncekiYon = yon;

    // Ilk emir asla ters degil - kural once duz haliyle ogrenilsin.
    // Ucten fazla ters ust uste gelirse beyin "hep ters" moduna gecip
    // isin zorlugu kayboluyor; ondan sonra bir duz emir zorunlu.
    let ters = emirler.length > 0 && ustUsteTers < 3 && Math.random() < TERS_ORAN;
    ustUsteTers = ters ? ustUsteTers + 1 : 0;

    emirler.push({ t: t, yon: yon, ters: ters, pencere: pencere });
    t += pencere + ARA * (1 - 0.3 * sv);
  }

  // En az bir ters emir garantisi: rastgelelik hepsini duz getirmis olabilir
  if (emirler.length > 1 && !emirler.some((e) => e.ters)) {
    emirler[1 + Math.floor(Math.random() * (emirler.length - 1))].ters = true;
  }
  return emirler;
}

module.exports = {
  id: 'tersemir',
  name: 'TERS EMIR',
  instruction: 'KIRMIZIYSA TERSINE BAS!',
  controls: 'dpad',
  duration: DURATION,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    // Tur suresi seviyeyle kisalir ve emir sayisindan BAGIMSIZDIR: emirler
    // bu butcenin icine sigacak kadar uretilir, sonuncusu bitince tur
    // done() ile zaten erken kapanir.
    const sure = DURATION * (1 - 0.15 * sv);
    const emirler = emirlerUret(sv, sure - 0.5);

    const pl = {};
    playerIds.forEach((id) => {
      pl[id] = { score: 0, dogru: 0, yanlis: 0, kacan: 0, son: null, flash: 0, iyi: true };
    });

    return {
      ids: playerIds.slice(),
      emirler: emirler,
      pl: pl,
      i: 0,                                   // sirada bekleyen/aktif emir
      t: 0,
      sure: sure,

      // O an ekranda duran emir. Emirler arasi boslukta null doner.
      aktifEmir() {
        if (this.i >= this.emirler.length) return null;
        const e = this.emirler[this.i];
        return this.t >= e.t ? e : null;
      },

      input(pid, a, d) {
        if (a !== 'dir') return;
        const me = this.pl[pid];
        if (!me) return;
        const e = this.aktifEmir();
        if (!e) return;                        // bosluktayken basmak bir sey yapmaz
        if (me.son && me.son.i === this.i) return;   // bu emre zaten cevap verdi

        const beklenen = e.ters ? TERSI[e.yon] : e.yon;
        const dogru = d === beklenen;
        me.son = { i: this.i, ok: dogru };
        if (dogru) { me.score += 1; me.dogru++; }
        else { me.score -= 1; me.yanlis++; }
        me.flash = 0.3;
        me.iyi = dogru;
      },

      update(dt) {
        this.t += dt;

        // Penceresi kapanan emirleri kapat: cevaplamayanlar kacirmis olur
        while (this.i < this.emirler.length) {
          const e = this.emirler[this.i];
          if (this.t < e.t + e.pencere) break;
          for (const id of this.ids) {
            const me = this.pl[id];
            if (!me.son || me.son.i !== this.i) me.kacan++;
          }
          this.i++;
        }

        for (const id of this.ids) {
          if (this.pl[id].flash > 0) this.pl[id].flash -= dt;
        }
      },

      // ---- bu oyuna ozel bot ----
      // Genel dpad botu rastgele yone basardi: 4 yonde %25 isabet, yanlislar
      // -1 oldugu icin skoru ekside kapatirdi (yani hic oynamayandan kotu).
      //
      // Buradaki bot insanin yaptigi hatayi yapar: KOLAY bot yaziyi okuyup
      // oldugu gibi basar, kirmizi oldugunu cogu zaman fark etmez. ZOR bot
      // her seferinde cevirir. Zorluk boylece oyunun kendi fikriyle ayni
      // yerden gelir - "daha hizli tiklamak"tan degil.
      //
      // Yalnizca snap ciktisini kullanir; ilerideki emirlere bakmaz.
      botHamle(pid, snap, zorluk) {
        const me = snap.pl[pid];
        if (!me || !snap.emir) return;
        if (me.cv !== 0) return;                   // bu emre zaten cevap verdi

        // Okuma payi: emir ekrana gelir gelmez basmasin
        const TEPKI = [0.55, 0.32, 0.16];
        const tepki = TEPKI[zorluk] !== undefined ? TEPKI[zorluk] : 0.32;
        if (snap.gecen < tepki) return;

        // ZOR bot bilerek KUSURSUZ DEGIL: kusursuz olsaydi insan onu en fazla
        // berabere tutabilirdi (bu oyunda tavan 8/8 ve beraberlik cozucu yok).
        // Sekil Yerlestir/Puzzle'da bunu bitirme suresi cozuyor, burada
        // cozemedigi icin zor bota da kucuk bir hata payi birakildi.
        const CEVIRME = [0.55, 0.82, 0.95];        // ters emri fark etme orani
        const SASMA = [0.12, 0.04, 0.015];         // duz emirde bile parmak kaymasi
        const cevirme = CEVIRME[zorluk] !== undefined ? CEVIRME[zorluk] : 0.82;
        const sasma = SASMA[zorluk] !== undefined ? SASMA[zorluk] : 0.04;

        let yon = snap.emir.y;
        if (snap.emir.ters) {
          if (Math.random() < cevirme) yon = TERSI[yon];
        } else if (Math.random() < sasma) {
          yon = YONLER[Math.floor(Math.random() * YONLER.length)];
        }
        this.input(pid, 'dir', yon);
      },

      done() { return this.i >= this.emirler.length; },

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
        if (!w.length) return { k: 'sonuc.tersemir.kimse' };
        const me = this.pl[w[0]];
        const p = { n: me.dogru, t: this.emirler.length, y: me.yanlis };
        return me.yanlis
          ? { k: 'sonuc.tersemir.skorYanlis', p: p }
          : { k: 'sonuc.tersemir.skor', p: p };
      },

      snap() {
        const e = this.i < this.emirler.length ? this.emirler[this.i] : null;
        const aktif = !!e && this.t >= e.t;

        const pl = {};
        for (const id of this.ids) {
          const me = this.pl[id];
          pl[id] = {
            s: me.score,
            // Bu emre verdigi cevap: 0 vermedi, 1 dogru, 2 yanlis
            cv: me.son && me.son.i === this.i ? (me.son.ok ? 1 : 2) : 0,
            fl: me.flash > 0 ? (me.iyi ? 1 : 2) : 0,
          };
        }

        return {
          no: this.i, adet: this.emirler.length,
          // SADECE o an ekranda olan emir gonderilir. Sonrakiler istemcide
          // hic bulunmadigi icin paketi okumak bir sey kazandirmaz.
          emir: aktif ? { y: e.yon, ad: AD[e.yon], ters: e.ters } : null,
          // aktifse cevap suresi doluyor, degilse emrin gelmesine kalan sure
          kalan: e ? Math.max(0, (aktif ? e.t + e.pencere : e.t) - this.t) : 0,
          pencere: e ? e.pencere : 1,
          gecen: aktif ? this.t - e.t : 0,
          pl: pl,
        };
      },
    };
  },
};
