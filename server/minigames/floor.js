'use strict';
// ZEMIN COKUYOR - HERKES AYNI 5x5 izgarada oynar; kareler tek tek cokuyor,
// 4 yonde kacip ayakta kalmaya calisiyorsun.
//
// Ortak izgara bilerek secildi: ekran bolununce hem saha kuculuyor hem de
// oyuncular birbirini gormuyordu. Simdi herkes ayni karelerde, birbirinin
// nereye kactigini gorerek oynuyor.
//
// Ayni kareye birden fazla oyuncu girebilir - kimse kimseyi engellemez.
// Engelleme olsaydi rakip senin tek kacis karene oturup seni caresiz
// birakabilirdi; o da adalet garantisini bozardi.
//
// Bir kare once YANIP SONER (uyari), sonra cokup kalici olarak kaybolur.
// Uzerindeyken cokerse dusersin. Son ayakta kalan kazanir; herkes duserse
// en gec dusen.
//
// Cokme programi BIR KEZ uretilir ve HERKES ayni deseni oynar - kimseye daha
// kolay desen dusmez. Uretim sirasinda su kural zorlanir:
//
//   Bir kare cokmeye alinirken, cokme SONRASINDA kalan her saglam karenin
//   en az bir saglam komsusu olmali; cokecek karenin de kacilacak bir
//   komsusu olmali.
//
// Cokmus kareler kumesi yalnizca BUYUDUGU icin bu kontrol her an gecerli
// kalir: bir kez saglanan garanti sonradan bozulamaz. Kareleri geri getiren
// bir surum de denendi, ama orada kume buyuyup kuculdugu icin garanti ara
// anlarda kiriliyordu (olculdu) - o yuzden kalici cokme tercih edildi.
//
// Sonuc: oyuncu hicbir zaman kusatilip caresiz kalmaz; olum sansa degil
// tepkiye baglidir. (Engelden Kac'taki "desen her zaman gecilebilir"
// garantisinin izgara karsiligi.)

const { dereceler } = require('./siralama');

const N = 5;                 // izgara N x N
const DURATION = 14;
const UYARI = 0.75;          // kare cokmeden once ne kadar yanip soner
const ILK_COKME = 1.4;
const ARA_BAS = 0.85;        // cokmeler arasi bekleme (basta)
const ARA_SON = 0.4;         // ... ve tur sonuna dogru
const EN_AZ_KALAN = 3;       // izgara bu kare sayisinin altina inmez
// Oyuncular kenar ortalarindan baslar: birbirinden uzak ve simetrik.
// (Koseler 2 komsulu oldugu icin baslangic olarak daha dezavantajli olurdu.)
const BASLANGIC = [10, 14, 2, 22];

function komsular(h) {
  const x = h % N, y = Math.floor(h / N);
  const out = [];
  if (x > 0) out.push(h - 1);
  if (x < N - 1) out.push(h + 1);
  if (y > 0) out.push(h - N);
  if (y < N - 1) out.push(h + N);
  return out;
}

// aday da coktukten sonra kimse komsusuz kaliyor mu?
function uygunMu(aday, cokmus) {
  const sonra = new Set(cokmus);
  sonra.add(aday);
  if (N * N - sonra.size < EN_AZ_KALAN) return false;

  // Cokecek karenin uzerindeki oyuncunun kacacak yeri olmali
  if (!komsular(aday).some((k) => !sonra.has(k))) return false;

  // Kalan her karenin de en az bir saglam komsusu olmali
  for (let h = 0; h < N * N; h++) {
    if (sonra.has(h)) continue;
    if (!komsular(h).some((k) => !sonra.has(k))) return false;
  }
  return true;
}

function desenUret(sv, sure, zorunlu) {
  const uyari = UYARI * (1 - 0.4 * sv);      // turlar ilerledikce tepki payi daralir
  const cokmus = new Set();
  const plan = [];
  let t = ILK_COKME;

  while (t < sure - 0.5) {
    const oran = Math.min(1, (t - ILK_COKME) / Math.max(0.1, sure - ILK_COKME));
    const ara = (ARA_BAS - (ARA_BAS - ARA_SON) * oran) * (1 - 0.3 * sv);
    const adet = Math.random() < 0.3 + 0.35 * oran ? 2 : 1;

    for (let i = 0; i < adet; i++) {
      const adaylar = [];
      for (let h = 0; h < N * N; h++) {
        if (!cokmus.has(h) && uygunMu(h, cokmus)) adaylar.push(h);
      }
      if (!adaylar.length) return plan;             // guvenle cokecek kare kalmadi

      // Oyuncularin BASLADIGI kareler, turun yarisindan sonra oncelikli olarak
      // cokertilir. Yoksa hic kipirdamayan biri sirf durdugu kare cokmedigi
      // icin kurtulabiliyordu (olculdu: maclarin %17'si). Uyari suresi yine
      // verildigi icin bu haksiz bir olum degil, sadece "oyna" zorlamasi.
      const bekleyen = zorunlu.filter((h) => !cokmus.has(h) && adaylar.indexOf(h) >= 0);
      const secilen = (t > sure * 0.4 && bekleyen.length)
        ? bekleyen[0]
        : adaylar[Math.floor(Math.random() * adaylar.length)];
      cokmus.add(secilen);
      plan.push({ h: secilen, t: t, uyari: uyari });
    }
    t += Math.max(0.3, ara);
  }
  return plan;
}

module.exports = {
  id: 'floor',
  name: 'ZEMIN COKUYOR',
  instruction: 'COKEN KARELERDEN KAC!',
  controls: 'dpad',
  duration: DURATION,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    const sure = DURATION * (1 - 0.2 * sv);

    const pl = {};
    const baslangiclar = [];
    playerIds.forEach((id, i) => {
      const h = BASLANGIC[i % BASLANGIC.length];
      baslangiclar.push(h);
      pl[id] = { h: h, alive: true, deadAt: sure };
    });

    const plan = desenUret(sv, sure, baslangiclar);

    return {
      ids: playerIds.slice(),
      n: N,
      sure,
      plan,
      pl,
      t: 0,

      // 0 = saglam, 1 = uyari (yanip soniyor), 2 = cokmus
      hucreDurum(h) {
        for (let i = 0; i < this.plan.length; i++) {
          const p = this.plan[i];
          if (p.h !== h) continue;
          if (this.t >= p.t + p.uyari) return 2;
          if (this.t >= p.t) return 1;
          return 0;
        }
        return 0;
      },

      input(pid, a, d) {
        if (a !== 'dir') return;
        const me = this.pl[pid];
        if (!me || !me.alive) return;

        const x = me.h % N, y = Math.floor(me.h / N);
        let nx = x, ny = y;
        if (d === 'left') nx--;
        else if (d === 'right') nx++;
        else if (d === 'up') ny--;
        else if (d === 'down') ny++;
        else return;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) return;

        const hedef = ny * N + nx;
        // Cokmus kareye adim atilmaz - istemeden intihar olmasin.
        // Uyaridaki kareye girilebilir: risk oyuncunun kendi tercihi.
        if (this.hucreDurum(hedef) === 2) return;
        me.h = hedef;
      },

      update(dt) {
        this.t += dt;
        for (let i = 0; i < this.plan.length; i++) {
          const p = this.plan[i];
          if (p.dustu || this.t < p.t + p.uyari) continue;
          p.dustu = true;
          for (const id of this.ids) {
            const me = this.pl[id];
            if (me.alive && me.h === p.h) {
              me.alive = false;
              me.deadAt = this.t;
            }
          }
        }
      },

      done() {
        return this.ids.every((id) => !this.pl[id].alive);
      },

      // Ayakta kalanlar esit birinci; dusenler arasinda GEC dusen onde.
      derece() {
        return dereceler(this.ids, (id) => {
          const p = this.pl[id];
          return p.alive ? -1e6 : -p.deadAt;
        });
      },

      winners() {
        const ayakta = this.ids.filter((id) => this.pl[id].alive);
        if (ayakta.length === this.ids.length) return [];      // hepsi kurtuldu
        if (ayakta.length > 0) return ayakta;
        const enGec = Math.max(...this.ids.map((id) => this.pl[id].deadAt));
        const top = this.ids.filter((id) => this.pl[id].deadAt >= enGec - 1e-6);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        const ayakta = this.ids.filter((id) => this.pl[id].alive);
        if (!this.winners().length) {
          return ayakta.length ? 'HEPSI AYAKTA KALDI!' : 'AYNI ANDA DUSTULER!';
        }
        if (ayakta.length > 0) return 'AYAKTA KALAN!';
        return 'EN GEC DUSEN!';
      },

      snap() {
        const hucreler = [];
        for (let h = 0; h < N * N; h++) hucreler.push(this.hucreDurum(h));
        const pl = {};
        for (const id of this.ids) {
          pl[id] = { h: this.pl[id].h, a: this.pl[id].alive };
        }
        return { n: N, hucre: hucreler, pl: pl };
      },
    };
  },
};
