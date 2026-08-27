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

  test('olcek her zaman tam sayiya yuvarlanmiyor', () => {
    // Eski satir: var k = scale >= 1 ? Math.floor(scale) : scale;
    // Bu geri gelirse telefonda tuval yine 320x180'e cakilir.
    assert.ok(main.indexOf('scale >= 1 ? Math.floor(scale) : scale') < 0,
      'olcek yine her zaman asagi yuvarlaniyor - telefonda tuval kucuk kalir');
    assert.ok(main.indexOf('Math.floor(scale) >= 2') >= 0,
      'yuvarlama esigi (2 kat) main.js"de bulunamadi');
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
