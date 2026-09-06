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
  // Satir adlari artik ANAHTAR ({ k: 'istat.enCokTur' }); ceviri istemcide.
  return liste.find((x) => x.ad && x.ad.k === ad) || null;
}

describe('Tur kazanma', () => {
  test('en cok tur kazanan sayilir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p0'], ['p2'], ['p1']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    const s = satir(oda, 'istat.enCokTur');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU0');
    assert.deepStrictEqual(s.deger, { k: 'istat.tur', p: { n: 2 } });
  });

  test('esitlik varsa satir gosterilmez', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);
    assert.strictEqual(satir(oda, 'istat.enCokTur'), null,
      'ikisi de 1 tur kazandi, "en cok" anlamsiz');
  });

  test('berabere turlar kimseye kazanma yazmaz', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0', 'p1', 'p2']]);      // tek grup = berabere
    assert.strictEqual(satir(oda, 'istat.enCokTur'), null);
  });
});

describe('Seri', () => {
  test('ust uste kazanma sayilir', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);
    const s = satir(oda, 'istat.enUzunSeri');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU0');
    assert.deepStrictEqual(s.deger, { k: 'istat.seri', p: { n: 3 } });
  });

  test('seri arada bozulunca sifirlanir', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);          // seri bozuldu
    tur(oda, [['p0'], ['p1']]);
    assert.strictEqual(satir(oda, 'istat.enUzunSeri'), null,
      'en uzun seri 1, gosterilmemeli');
  });

  test('tek tur kazanmak seri sayilmaz', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    assert.strictEqual(satir(oda, 'istat.enUzunSeri'), null);
  });
});

describe('Uzmanlik alani', () => {
  test('ayni oyunu iki kez kazanan uzman sayilir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']], 'mole');
    tur(oda, [['p1'], ['p0'], ['p2']], 'race');
    tur(oda, [['p0'], ['p2'], ['p1']], 'mole');
    const s = satir(oda, 'istat.uzmanlik');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU0');
    // Oyun ADI da istemcide cevriliyor: sunucu yalnizca id gonderir
    assert.strictEqual(s.deger.k, 'istat.uzmanlikDeger');
    assert.strictEqual(s.deger.p.oyun, 'mole');
    assert.strictEqual(s.deger.p.n, 2);
  });

  test('her oyunu bir kez kazanmak uzmanlik degil', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']], 'mole');
    tur(oda, [['p0'], ['p1']], 'race');
    assert.strictEqual(satir(oda, 'istat.uzmanlik'), null);
  });
});

describe('Hic kazanamayan', () => {
  test('hic tur alamayanlar listelenir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    const s = satir(oda, 'istat.hicKazanamadi');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU2');
  });

  test('herkes kazandiysa satir cikmaz', () => {
    const { oda } = macKur(2);
    tur(oda, [['p0'], ['p1']]);
    tur(oda, [['p1'], ['p0']]);
    assert.strictEqual(satir(oda, 'istat.hicKazanamadi'), null);
  });

  test('kimse kazanamadiysa satir cikmaz', () => {
    // Butun turlar berabere bittiyse "hic kazanamadi" herkes icin dogru
    // olurdu - anlamsiz oldugu icin gosterilmemeli.
    const { oda } = macKur(3);
    tur(oda, [['p0', 'p1', 'p2']]);
    assert.strictEqual(satir(oda, 'istat.hicKazanamadi'), null);
  });
});

describe('Sonunculuk', () => {
  test('tek basina sonuncu olmak sayilir', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0'], ['p1'], ['p2']]);
    tur(oda, [['p1'], ['p0'], ['p2']]);
    const s = satir(oda, 'istat.enCokSonuncu');
    assert.ok(s, 'satir yok');
    assert.strictEqual(s.kim, 'OYUNCU2');
    assert.deepStrictEqual(s.deger, { k: 'istat.tur', p: { n: 2 } });
  });

  test('berabere turda kimse sonuncu sayilmaz', () => {
    const { oda } = macKur(3);
    tur(oda, [['p0', 'p1', 'p2']]);
    tur(oda, [['p0', 'p1', 'p2']]);
    assert.strictEqual(satir(oda, 'istat.enCokSonuncu'), null);
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
      assert.strictEqual(typeof s.ad, 'object');
      assert.strictEqual(typeof s.ad.k, 'string');
      assert.strictEqual(typeof s.kim, 'string');
      assert.ok(typeof s.deger === 'object' || s.deger === '');
      assert.ok(s.ad.k.length > 0 && s.kim.length > 0);
    }
  });
});
