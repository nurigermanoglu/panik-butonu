'use strict';
// MAC SONU ISTATISTIKLERI
//
// Mini oyunlara HIC dokunmadan, yalnizca tur sonuclarindan cikarilir.
// Bir satir ancak ANLAMLIYSA listeye girer: esitlik varsa "en cok" demek
// anlamsizlasir, tek tur kazanmak "seri" sayilmaz.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { odaKur } = require('./yardimci');
const MINIGAMES = require('../server/minigames');

// Odayi mac fazina alir ve turlari elle oynatir
function macKur(kisi) {
  const { oda, oyuncular } = odaKur(kisi, { hedef: 9 });   // uzun mac
  for (const p of oyuncular) oda.game.setReady(p, true);
  return { oda, oyuncular };
}

// gruplar: [['p0'], ['p1','p2']] seklinde derece siralamasi
function tur(oda, gruplar, oyunId) {
  oda.game.mg = MINIGAMES.find((m) => m.id === (oyunId || 'race'));
  oda.game.inst = {
    derece: () => gruplar,
    winners: () => (gruplar.length > 1 ? gruplar[0] : []),
    text: () => '',
    snap: () => ({}),
  };
  oda.game.finishRound();
}

function satir(oda, ad) {
  // Gercek akista afterResult sampiyon ekranina gecerken inst'i bosaltiyor
  oda.game.phase = 'gameover';
  oda.game.inst = null;
  const liste = oda.game.snapshot().istat || [];
  return liste.find((x) => x.ad === ad) || null;
}

describe('Tur kazanma', () => {
  test('en cok tur kazanan sayilir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p0'], ['p2'], ['p1']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    const s = satir(oda, 'EN COK TUR KAZANAN');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU0');
    assert.strictEqual(s.deger, '2 TUR');
  });

  test('esitlik varsa satir gosterilmez', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);
    assert.strictEqual(satir(oda, 'EN COK TUR KAZANAN'), null,
      'ikisi de 1 tur kazandi, "en cok" anlamsiz');
  });

  test('berabere turlar kimseye kazanma yazmaz', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0', 'p1', 'p2']]);      // tek grup = berabere
    assert.strictEqual(satir(oda, 'EN COK TUR KAZANAN'), null);
  });
});

describe('Seri', () => {
  test('ust uste kazanma sayilir', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);
    const s = satir(oda, 'EN UZUN SERI');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU0');
    assert.strictEqual(s.deger, '3 TUR UST USTE');
  });

  test('seri arada bozulunca sifirlanir', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);          // seri bozuldu
    tur(oda, [['p0'], ['p1']]);
    assert.strictEqual(satir(oda, 'EN UZUN SERI'), null,
      'en uzun seri 1, gosterilmemeli');
  });

  test('tek tur kazanmak seri sayilmaz', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    assert.strictEqual(satir(oda, 'EN UZUN SERI'), null);
  });
});

describe('Uzmanlik alani', () => {
  test('ayni oyunu iki kez kazanan uzman sayilir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']], 'mole');
    tur(oda, [['p1'], ['p0'], ['p2']], 'race');
    tur(oda, [['p0'], ['p2'], ['p1']], 'mole');
    const s = satir(oda, 'UZMANLIK ALANI');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU0');
    assert.ok(s.deger.indexOf('KOSTEBEK AVI') >= 0, 'oyun adi yok: ' + s.deger);
    assert.ok(s.deger.indexOf('x2') >= 0, 'sayi yok: ' + s.deger);
  });

  test('her oyunu bir kez kazanmak uzmanlik degil', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']], 'mole');
    tur(oda, [['p0'], ['p1']], 'race');
    assert.strictEqual(satir(oda, 'UZMANLIK ALANI'), null);
  });
});

describe('Hic kazanamayan', () => {
  test('hic tur alamayanlar listelenir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    const s = satir(oda, 'HIC TUR KAZANAMADI');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU2');
  });

  test('herkes kazandiysa satir cikmaz', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);
    assert.strictEqual(satir(oda, 'HIC TUR KAZANAMADI'), null);
  });

  test('kimse kazanamadiysa satir cikmaz', () => {
    // Butun turlar berabere bittiyse "hic kazanamadi" herkes icin dogru
    // olurdu - anlamsiz oldugu icin gosterilmemeli.
    const { oda } = macKur(3);
    tur(oda, [['p0', 'p1', 'p2']]);
    assert.strictEqual(satir(oda, 'HIC TUR KAZANAMADI'), null);
  });
});

describe('Sonunculuk', () => {
  test('tek basina sonuncu olmak sayilir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    const s = satir(oda, 'EN COK SONUNCU');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU2');
    assert.strictEqual(s.deger, '2 TUR');
  });

  test('berabere turda kimse sonuncu sayilmaz', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0', 'p1', 'p2']]);
    tur(oda, [['p0', 'p1', 'p2']]);
    assert.strictEqual(satir(oda, 'EN COK SONUNCU'), null);
  });
});

describe('Yayinlama', () => {
  test('istatistikler yalnizca sampiyon ekraninda gonderilir', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p0'], ['p1']]);
    oda.game.phase = 'play';
    assert.strictEqual(oda.game.snapshot().istat, null, 'mac sirasinda gonderiliyor');
    oda.game.phase = 'gameover';
    assert.ok(oda.game.snapshot().istat, 'sampiyon ekraninda gonderilmiyor');
  });

  test('hicbir satir anlamli degilse null doner', () => {
    const { oda } = macKur(2);
    assert.strictEqual(oda.game.istatListesi(), null, 'hic tur oynanmadan satir uretildi');
  });

  test('lobiye donunce sifirlanir', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p0'], ['p1']]);
    oda.game.toLobby(null);
    assert.deepStrictEqual(oda.game.istat, {});
    assert.strictEqual(oda.game.istatListesi(), null);
  });

  test('satirlar cizilebilir bicimde', () => {
    const { oda } = macKur(4);
    tur(oda, [['p0'], ['p1'], ['p2'], ['p3']], 'mole');
    tur(oda, [['p0'], ['p2'], ['p1'], ['p3']], 'mole');
    oda.game.phase = 'gameover';
    const liste = oda.game.snapshot().istat;
    assert.ok(Array.isArray(liste) && liste.length, 'liste bos');
    for (const s of liste) {
      assert.strictEqual(typeof s.ad, 'string');
      assert.strictEqual(typeof s.kim, 'string');
      assert.strictEqual(typeof s.deger, 'string');
      assert.ok(s.ad.length > 0 && s.kim.length > 0);
    }
  });
});
