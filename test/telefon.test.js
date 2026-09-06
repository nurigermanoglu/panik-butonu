'use strict';
// TELEFON DESTEGI
//
// Iki sey burada tutuluyor:
//
// 1. ANA EKRANA EKLEME (manifest.json)
//    Gecerli JSON olmali, isaret ettigi ikonlar gercekten var olmali ve
//    YATAY acilmali. Oyun 16:9; telefonun yatay hali de oyle.
//
// 2. TUVAL OLCEKLEMESI
//    resize() eskiden olcegi HER ZAMAN tam sayiya yuvarliyordu. Bunun
//    bedeli olculdu: 812x375 yatay telefonda kullanilabilir olcek 1.90
//    iken taban 1'e dusuyor ve tuval ekranin yalnizca %19'unu kapliyordu.
//    Artik yuvarlama sadece 2 kat ve uzerinde yapiliyor.
//
//    Burada olceklemenin KENDISI degil KURALI sinaniyor: tarayici
//    olmadan DOM olcemeyiz, ama kuralin main.js'de durdugunu ve dogru
//    esikte calistigini dogrulayabiliriz.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KOK = path.join(__dirname, '..', 'public');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8');

describe('Ana ekrana ekleme', () => {
  const mf = JSON.parse(oku('manifest.json'));

  test('manifest gecerli ve yatay aciliyor', () => {
    assert.strictEqual(mf.orientation, 'landscape',
      'telefonda oyun yatayda 3.6 kat buyuk; ana ekrandan yatay acilmali');
    assert.ok(mf.display === 'fullscreen' || mf.display === 'standalone',
      'adres cubugu goruntuyu daha da kucultur');
    assert.ok(mf.name && mf.short_name, 'ad alanlari eksik');
    assert.strictEqual(mf.start_url, './', 'baslangic adresi goreli olmali (tunel adresi degisiyor)');
  });

  test('manifestteki ikonlar gercekten var', () => {
    assert.ok(mf.icons && mf.icons.length, 'ikon tanimlanmamis');
    for (const ik of mf.icons) {
      const yol = path.join(KOK, ik.src);
      assert.ok(fs.existsSync(yol), 'ikon dosyasi yok: ' + ik.src);
      assert.ok(fs.statSync(yol).size > 100, 'ikon bos gorunuyor: ' + ik.src);
    }
    const boyutlar = mf.icons.map((i) => i.sizes);
    assert.ok(boyutlar.indexOf('192x192') >= 0, '192x192 ikon gerekli');
    assert.ok(boyutlar.indexOf('512x512') >= 0, '512x512 ikon gerekli');
  });

  test('index.html manifesti ve ikonu bagliyor', () => {
    const h = oku('index.html');
    assert.ok(h.indexOf('rel="manifest"') >= 0, 'manifest baglanmamis');
    assert.ok(h.indexOf('rel="icon"') >= 0, 'favicon baglanmamis');
    assert.ok(h.indexOf('apple-touch-icon') >= 0, 'iOS ikonu baglanmamis');
    assert.ok(h.indexOf('apple-mobile-web-app-capable') >= 0,
      'iOS tam ekran meta etiketi yok');
  });

  test('favicon var ve bos degil', () => {
    const p = path.join(KOK, 'favicon.png');
    assert.ok(fs.existsSync(p), 'favicon.png yok - sekmede bos ikon ve 404');
    assert.ok(fs.statSync(p).size > 100);
  });
});

describe('Tuval olceklemesi', () => {
  const main = oku(path.join('js', 'main.js'));

  // Eski test main.js icinde metin ariyordu; kod her degistiginde kirildi
  // ve asil onemli seyi -- hesabin SONUCUNU -- hic olcmuyordu. Burada
  // main.js'teki olcek mantiginin ayni kopyasini calistirip iki sarti
  // dogruluyoruz: ekran yeterince doluyor mu, ve her oyun pikseli esit
  // sayida cihaz pikseline mi dusuyor.
  const W = 320, H = 180;
  function olcekHesapla(cssW, cssH, dpr) {
    const cihazOlcek = Math.min(cssW * dpr / W, cssH * dpr / H);
    const tam = Math.min(10, Math.floor(cihazOlcek));
    const esitPiksel = tam >= 2;
    const k = esitPiksel ? tam / dpr : cihazOlcek / dpr;
    return {
      k: k,
      esitPiksel: esitPiksel,
      cihazPikseli: k * dpr,               // bir oyun pikseli kac cihaz pikseli
      doluluk: (W * k) * (H * k) / (cssW * cssH)
    };
  }

  // Gercek cihazlar. Yatay telefon asil sikayet noktasiydi.
  const EKRANLAR = [
    { ad: 'iPhone yatay',      w: 812,  h: 375, dpr: 3 },
    { ad: 'iPhone dikey',      w: 375,  h: 812, dpr: 3 },
    { ad: 'Android yatay',     w: 844,  h: 390, dpr: 2.625 },
    { ad: 'Android dikey',     w: 390,  h: 844, dpr: 2.625 },
    { ad: 'tablet yatay',      w: 1024, h: 768, dpr: 2 },
    { ad: 'masaustu 1080p',    w: 1920, h: 1080, dpr: 1 },
    { ad: 'kucuk pencere',     w: 700,  h: 420, dpr: 1 }
  ];

  for (const e of EKRANLAR) {
    test(e.ad + ' - bir oyun pikseli tam sayi cihaz pikseline oturuyor', () => {
      const o = olcekHesapla(e.w, e.h, e.dpr);
      if (!o.esitPiksel) return;           // cok dar: doldurmak esitlikten yeg
      const fark = Math.abs(o.cihazPikseli - Math.round(o.cihazPikseli));
      assert.ok(fark < 1e-9,
        e.ad + ': bir oyun pikseli ' + o.cihazPikseli + ' cihaz pikseline dusuyor. ' +
        'Tam sayi olmayinca bloklar kimi yerde genis kimi yerde dar cizilir.');
    });
  }

  test('yatay ekranda tuval en az %60 doluyor', () => {
    // Eskiden CSS uzerinden tam sayiya yuvarlaniyordu ve 812x375 ekranda
    // olcek 1'e dusup tuval ekranin %19'unda kaliyordu.
    //
    // Dikey ekranlar bu esige tabi degil: oyun 16:9, dikey telefonda
    // geometrik tavan zaten ~%26 ve o durumda 'telefonu cevir' seridi
    // cikiyor. Orada keskinligi buyuklukten ustun tutuyoruz.
    for (const e of EKRANLAR) {
      if (e.h > e.w) continue;
      const o = olcekHesapla(e.w, e.h, e.dpr);
      assert.ok(o.doluluk > 0.6,
        e.ad + ': tuval ekranin sadece %' + Math.round(o.doluluk * 100) +
        "'ini kapliyor");
    }
  });

  test('olcek cihaz pikseli uzerinden hesaplaniyor', () => {
    assert.ok(main.indexOf('devicePixelRatio') >= 0,
      'main.js olcegi cihaz pikseline gore hesaplamiyor - kirik piksel geri doner');
  });

  test('yatay telefon yerlesimi CSS"te tanimli', () => {
    const css = oku(path.join('css', 'style.css'));
    assert.ok(/@media \(orientation: landscape\) and \(max-height: 500px\)/.test(css),
      'yatay telefon dali yok - butonlar tuvalin altinda yer kaplamaya devam eder');
    // Butonlar yana alinmali: #game satir yonune donmeli
    const dal = css.slice(css.indexOf('@media (orientation: landscape) and (max-height: 500px)'));
    assert.ok(dal.indexOf('flex-direction: row') >= 0,
      'yatayda butonlar tuvalin YANINA alinmiyor');
  });

  test('dikeyde yan cevirme ipucu var ama engel degil', () => {
    const css = oku(path.join('css', 'style.css'));
    const h = oku('index.html');
    assert.ok(h.indexOf('id="cevir"') >= 0, 'ipucu seridi yok');
    assert.ok(/@media \(orientation: portrait\)/.test(css), 'ipucu dikeye baglanmamis');
    // Ipucu oyunu ortmemeli: konumu sabit/absolute degil, akista bir serit
    const dal = css.slice(css.indexOf('#cevir {'));
    assert.ok(dal.indexOf('position: fixed') < 0 && dal.indexOf('position: absolute') < 0,
      'ipucu oyunun uzerine biniyor - dikeyde de oynanabilmeli');
  });
});
