'use strict';
// TERS EMIR
//
// Uc grup iddia var:
//   1. EMIR LISTESI adil ve okunabilir uretiliyor mu (ilk emir duz, ayni yon
//      ard arda gelmiyor, ters emirler ust uste yigilmiyor)
//   2. PUANLAMA dogru mu (dogru +1, yanlis -1, bos 0; bir emre tek cevap)
//   3. Ileriyi GOREMEZLIK: snap yalnizca o an ekranda olan emri tasiyor -
//      paketi okuyan biri sonraki emri ogrenemez.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT } = require('./yardimci');
const tersemir = require('../server/minigames/tersemir');

const TERSI = { left: 'right', right: 'left', up: 'down', down: 'up' };

// inst'i aktif emir gelene kadar ilerletir. Emir kalmadiysa null doner.
function emreGel(inst) {
  for (let i = 0; i < 2000; i++) {
    if (inst.aktifEmir()) return inst.aktifEmir();
    if (inst.done()) return null;
    inst.update(DT);
  }
  return null;
}

// Aktif emrin penceresi kapanana kadar ilerletir.
function emriGecir(inst) {
  const bas = inst.i;
  for (let i = 0; i < 2000 && inst.i === bas && !inst.done(); i++) inst.update(DT);
}

function dogruYon(e) { return e.ters ? TERSI[e.yon] : e.yon; }

describe('Emir listesi', () => {
  test('ilk emir asla ters degil', () => {
    // Kural once duz haliyle ogrenilsin: tur "TERS" ile acilmaz.
    for (let n = 0; n < 300; n++) {
      const inst = tersemir.create(['p0'], Math.random(), {});
      assert.ok(inst.emirler.length > 0, 'emir uretilmedi');
      assert.strictEqual(inst.emirler[0].ters, false, 'ilk emir ters cikti');
    }
  });

  test('ayni yon ard arda gelmiyor', () => {
    for (let n = 0; n < 300; n++) {
      const e = tersemir.create(['p0'], Math.random(), {}).emirler;
      for (let i = 1; i < e.length; i++) {
        assert.notStrictEqual(e[i].yon, e[i - 1].yon,
          'ayni yon iki kez ust uste geldi (' + e[i].yon + ')');
      }
    }
  });

  test('ucten fazla ters ust uste gelmiyor', () => {
    // Ust uste ters yagarsa beyin "hep ters" moduna geciyor ve oyunun
    // zorlugu kayboluyor. Arada duz emir gelmesi kurali sinaniyor.
    for (let n = 0; n < 300; n++) {
      const e = tersemir.create(['p0'], Math.random(), {}).emirler;
      let seri = 0;
      for (const emir of e) {
        seri = emir.ters ? seri + 1 : 0;
        assert.ok(seri <= 3, seri + ' ters emir ust uste geldi');
      }
    }
  });

  test('her turda en az bir ters emir var', () => {
    // Rastgelelik hepsini duz getirirse oyun kendi fikrini kaybeder.
    for (let n = 0; n < 300; n++) {
      const e = tersemir.create(['p0'], Math.random(), {}).emirler;
      assert.ok(e.some((x) => x.ters), 'hic ters emir yok');
    }
  });

  test('emirler cakismiyor ve sureye sigiyor', () => {
    for (let n = 0; n < 200; n++) {
      const inst = tersemir.create(['p0'], Math.random(), {});
      const e = inst.emirler;
      for (let i = 1; i < e.length; i++) {
        assert.ok(e[i].t >= e[i - 1].t + e[i - 1].pencere,
          'emirlerin pencereleri ust uste biniyor');
      }
      const son = e[e.length - 1];
      assert.ok(son.t + son.pencere <= inst.sure,
        'son emir tur suresinin disinda kaliyor');
    }
  });

  test('herkes ayni emirleri gorur', () => {
    // Emirler oyuncuya gore degil TURA gore uretilir; dort kisilik odada
    // tek liste var, yani kimsenin ekraninda farkli bir sey olmaz.
    const inst = tersemir.create(['p0', 'p1', 'p2', 'p3'], 0.5, {});
    assert.ok(Array.isArray(inst.emirler));
    const e = emreGel(inst);
    const snaplar = ['p0', 'p1', 'p2', 'p3'].map(() => inst.snap().emir);
    for (const s of snaplar) {
      assert.strictEqual(s.y, e.yon);
      assert.strictEqual(s.ters, e.ters);
    }
  });
});

describe('Puanlama', () => {
  test('dogru cevap +1, yanlis -1', () => {
    const inst = tersemir.create(['p0', 'p1'], 0, {});
    const e = emreGel(inst);
    inst.input('p0', 'dir', dogruYon(e));
    inst.input('p1', 'dir', TERSI[dogruYon(e)]);
    assert.strictEqual(inst.pl.p0.score, 1);
    assert.strictEqual(inst.pl.p1.score, -1);
    assert.strictEqual(inst.pl.p0.dogru, 1);
    assert.strictEqual(inst.pl.p1.yanlis, 1);
  });

  test('ters emirde tersine basmak dogrudur', () => {
    const inst = tersemir.create(['p0'], 1, {});
    // Ilk ters emre kadar ilerle
    let e = emreGel(inst);
    while (e && !e.ters) { emriGecir(inst); e = emreGel(inst); }
    assert.ok(e, 'ters emir bulunamadi');
    inst.input('p0', 'dir', TERSI[e.yon]);
    assert.strictEqual(inst.pl.p0.score, 1, 'ters emirde tersi dogru sayilmali');
  });

  test('ters emirde yazani okuyup basmak yanlistir', () => {
    const inst = tersemir.create(['p0'], 1, {});
    let e = emreGel(inst);
    while (e && !e.ters) { emriGecir(inst); e = emreGel(inst); }
    assert.ok(e, 'ters emir bulunamadi');
    inst.input('p0', 'dir', e.yon);
    assert.strictEqual(inst.pl.p0.score, -1);
  });

  test('bir emre iki kez cevap verilemez', () => {
    // Yoksa dort yone birden basip garantiye almak mumkun olurdu.
    const inst = tersemir.create(['p0'], 0, {});
    const e = emreGel(inst);
    inst.input('p0', 'dir', TERSI[dogruYon(e)]);   // once yanlis
    inst.input('p0', 'dir', dogruYon(e));          // sonra dogru - sayilmamali
    assert.strictEqual(inst.pl.p0.score, -1);
    assert.strictEqual(inst.pl.p0.dogru, 0);
  });

  test('emirler arasi boslukta basmak bir sey yapmaz', () => {
    const inst = tersemir.create(['p0'], 0, {});
    assert.strictEqual(inst.aktifEmir(), null, 'tur emirle baslamamali');
    inst.input('p0', 'dir', 'left');
    inst.input('p0', 'dir', 'right');
    assert.strictEqual(inst.pl.p0.score, 0, 'boslukta basmak puani degistirdi');
  });

  test('pencere kapandiktan sonra o emir cevaplanamaz', () => {
    const inst = tersemir.create(['p0'], 0, {});
    const e = emreGel(inst);
    const yon = dogruYon(e);
    emriGecir(inst);                                // pencereyi kacir
    assert.strictEqual(inst.pl.p0.kacan, 1);
    // Simdi bosluktayiz; gecmis emrin cevabi artik islemez
    inst.input('p0', 'dir', yon);
    assert.strictEqual(inst.pl.p0.score, 0);
  });

  test('cevapsiz gecmek puan kaybettirmez', () => {
    // Emin degilsen elini cekmek gecerli bir strateji olsun.
    const inst = tersemir.create(['p0'], 0, {});
    while (!inst.done()) inst.update(DT);
    assert.strictEqual(inst.pl.p0.score, 0);
    assert.strictEqual(inst.pl.p0.kacan, inst.emirler.length);
  });

  test('hic oynamayan, biraz oynayandan geride kalir', () => {
    const inst = tersemir.create(['pasif', 'oynayan'], 0, {});
    while (!inst.done()) {
      const e = inst.aktifEmir();
      if (e) inst.input('oynayan', 'dir', dogruYon(e));
      inst.update(DT);
    }
    const gruplar = inst.derece();
    assert.deepStrictEqual(gruplar[0], ['oynayan']);
    assert.deepStrictEqual(gruplar[1], ['pasif']);
  });
});

describe('Sonuc', () => {
  test('esit skorlar ayni derece grubunda', () => {
    const inst = tersemir.create(['p0', 'p1', 'p2'], 0, {});
    while (!inst.done()) {
      const e = inst.aktifEmir();
      if (e) {
        inst.input('p0', 'dir', dogruYon(e));
        inst.input('p1', 'dir', dogruYon(e));
      }
      inst.update(DT);
    }
    const gruplar = inst.derece();
    assert.deepStrictEqual(gruplar[0].sort(), ['p0', 'p1']);
    assert.deepStrictEqual(gruplar[1], ['p2']);
  });

  test('herkes ayni skordaysa kazanan yok', () => {
    const inst = tersemir.create(['p0', 'p1'], 0, {});
    while (!inst.done()) {
      const e = inst.aktifEmir();
      if (e) {
        inst.input('p0', 'dir', dogruYon(e));
        inst.input('p1', 'dir', dogruYon(e));
      }
      inst.update(DT);
    }
    assert.deepStrictEqual(inst.winners(), []);
  });

  test('kimse puan alamadiysa kazanan yok', () => {
    const inst = tersemir.create(['p0', 'p1'], 0, {});
    while (!inst.done()) inst.update(DT);
    assert.deepStrictEqual(inst.winners(), []);
    assert.strictEqual(inst.text(), 'KIMSE SASIRTAMADI!');
  });
});

describe('Istemciye ne gonderiliyor', () => {
  test('snap sadece o an ekranda olan emri tasir', () => {
    // Paketi okuyan biri SONRAKI emri ogrenemesin: snap'te tek bir emir
    // alani var ve o da ancak emir ekrana geldiginde doluyor.
    const inst = tersemir.create(['p0'], 0, {});
    const bos = inst.snap();
    assert.strictEqual(bos.emir, null, 'emir gelmeden snap emir tasiyor');

    const e = emreGel(inst);
    const dolu = inst.snap();
    assert.strictEqual(dolu.emir.y, e.yon);

    // Gonderilen paketin tamaminda emir listesinin izi olmamali
    const metin = JSON.stringify(inst.snap());
    assert.ok(metin.indexOf('emirler') < 0, 'emir listesi istemciye sizmis');
    assert.ok(metin.indexOf('pencere') >= 0);
  });

  test('snap oyuncunun kendi cevabini bildirir', () => {
    const inst = tersemir.create(['p0', 'p1'], 0, {});
    const e = emreGel(inst);
    assert.strictEqual(inst.snap().pl.p0.cv, 0);
    inst.input('p0', 'dir', dogruYon(e));
    inst.input('p1', 'dir', TERSI[dogruYon(e)]);
    const s = inst.snap();
    assert.strictEqual(s.pl.p0.cv, 1, 'dogru cevap 1 olmali');
    assert.strictEqual(s.pl.p1.cv, 2, 'yanlis cevap 2 olmali');

    // Sonraki emre gecince isaret sifirlanir
    emriGecir(inst);
    emreGel(inst);
    assert.strictEqual(inst.snap().pl.p0.cv, 0);
  });
});

describe('Bot', () => {
  // Botu gercek dongudeki gibi calistirir: hamle araliklarini taklit eder.
  function botOynat(zorluk, seviye) {
    const inst = tersemir.create(['bot'], seviye, {});
    let bekle = 0;
    while (!inst.done()) {
      bekle -= DT;
      if (bekle <= 0) {
        bekle = (0.25 + Math.random() * 0.35) * [2.2, 1, 0.55][zorluk];
        inst.botHamle('bot', inst.snap(), zorluk);
      }
      inst.update(DT);
    }
    return inst.pl.bot;
  }

  function ortalama(zorluk, seviye, deneme) {
    let t = 0;
    for (let i = 0; i < deneme; i++) t += botOynat(zorluk, seviye).score;
    return t / deneme;
  }

  test('zorluk arttikca bot daha iyi oynuyor', () => {
    const kolay = ortalama(0, 0.5, 120);
    const orta = ortalama(1, 0.5, 120);
    const zor = ortalama(2, 0.5, 120);
    assert.ok(orta > kolay + 0.5, 'orta bot kolaydan belirgin iyi olmali (' + kolay + ' -> ' + orta + ')');
    assert.ok(zor > orta, 'zor bot ortadan iyi olmali (' + orta + ' -> ' + zor + ')');
  });

  test('en kolay bot bile hic oynamayandan iyi', () => {
    assert.ok(ortalama(0, 0.5, 120) > 0, 'kolay bot ekside kapatiyor');
  });

  test('zor bot kusursuz degil: insan onu gecebilir', () => {
    // Bu oyunda tavan sabit (her emir 1 puan) ve beraberlik cozucu yok.
    // Zor bot 8/8 yapsaydi insanin en iyi ihtimali beraberlik olurdu.
    const inst = tersemir.create(['bot'], 0.5, {});
    const tavan = inst.emirler.length;
    let toplam = 0;
    const N = 150;
    for (let i = 0; i < N; i++) toplam += botOynat(2, 0.5).score;
    assert.ok(toplam / N < tavan, 'zor bot her turu kusursuz bitiriyor');
  });

  test('bot emir yokken hamle yapmaz', () => {
    const inst = tersemir.create(['bot'], 0, {});
    for (let i = 0; i < 20; i++) inst.botHamle('bot', inst.snap(), 2);
    assert.strictEqual(inst.pl.bot.score, 0);
    assert.strictEqual(inst.pl.bot.yanlis, 0);
  });

  test('bot ayni emre iki kez basmaya calismaz', () => {
    const inst = tersemir.create(['bot'], 0, {});
    const e = emreGel(inst);
    // Tepki payini gecir
    for (let i = 0; i < 30 && !inst.pl.bot.son; i++) {
      inst.update(DT);
      inst.botHamle('bot', inst.snap(), 2);
    }
    assert.ok(inst.pl.bot.son, 'bot hic cevap vermedi');
    const skor = inst.pl.bot.score;
    for (let i = 0; i < 20; i++) inst.botHamle('bot', inst.snap(), 2);
    assert.strictEqual(inst.pl.bot.score, skor, 'bot ayni emre tekrar basti');
    assert.ok(e);
  });
});
