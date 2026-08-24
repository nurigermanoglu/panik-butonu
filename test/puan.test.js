'use strict';
// DERECE PUANI
//   n kisilik turda onunde k kisi olan (n - 1 - k) puan alir.
//   2 kisi -> 1 / 0        4 kisi -> 3 / 2 / 1 / 0
//   Herkes esitse kimse puan almaz.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, odaKur } = require('./yardimci');
const { dereceler } = require('../server/minigames/siralama');
const MINIGAMES = require('../server/minigames');

// Odayi mac fazina alip, mini oyun yerine sabit bir derece dondurten
// sahte bir ornek yerlestirir. Boylece puan dagitimini yalitilmis test ederiz.
function turOynat(kisi, gruplar) {
  const { oda, oyuncular } = odaKur(kisi);
  for (const p of oyuncular) oda.game.setReady(p, true);
  oda.game.inst = {
    derece: () => gruplar,
    winners: () => (gruplar.length > 1 ? gruplar[0] : []),
    text: () => '',
  };
  oda.game.puanDagit();
  return oyuncular.map((p) => p.wins);
}

describe('Puan dagitimi', () => {
  test('4 kisi: 3 / 2 / 1 / 0', () => {
    assert.deepStrictEqual(
      turOynat(4, [['p0'], ['p1'], ['p2'], ['p3']]), [3, 2, 1, 0]);
  });

  test('2 kisi: 1 / 0 (eski sistemle birebir ayni)', () => {
    assert.deepStrictEqual(turOynat(2, [['p0'], ['p1']]), [1, 0]);
  });

  test('3 kisi: 2 / 1 / 0', () => {
    assert.deepStrictEqual(turOynat(3, [['p0'], ['p1'], ['p2']]), [2, 1, 0]);
  });

  test('esit derecedekiler ayni puani paylasir', () => {
    // p1 ve p2 ikinci: ikisi de 2 puan. p3 dorduncu sirada, 0 puan.
    assert.deepStrictEqual(
      turOynat(4, [['p0'], ['p1', 'p2'], ['p3']]), [3, 2, 2, 0]);
  });

  test('bes kisi birinci olsa bile ikinci sira bos kalir', () => {
    // Ilk grupta iki kisi varsa sonraki grup UCUNCU sirada baslar.
    assert.deepStrictEqual(
      turOynat(4, [['p0', 'p1'], ['p2'], ['p3']]), [3, 3, 1, 0]);
  });

  test('herkes esitse kimse puan almaz', () => {
    // Yoksa berabere turlar herkesi hedefe ayni hizda yaklastirir ve
    // sampiyonluk aradaki farkla degil kurayla belirlenirdi.
    assert.deepStrictEqual(turOynat(4, [['p0', 'p1', 'p2', 'p3']]), [0, 0, 0, 0]);
    assert.deepStrictEqual(turOynat(2, [['p0', 'p1']]), [0, 0]);
  });

  test('derece() olmayan oyun maci kilitlemez', () => {
    const { oda, oyuncular } = odaKur(2);
    for (const p of oyuncular) oda.game.setReady(p, true);
    oda.game.inst = { winners: () => ['p0'], text: () => '' };
    oda.game.puanDagit();                       // patlamamali
    assert.deepStrictEqual(oyuncular.map((p) => p.wins), [0, 0]);
  });
});

describe('Hedef puan', () => {
  // Hedef eskiden kisi sayisiyla carpiliyordu (ayar 5 -> 4 kiside 15 puan).
  // Bunun yan etkisi suydu: lobide BOT eklemek ekrandaki hedefi oynatiyor,
  // "bot butonu hedefi de degistiriyor" gibi gorunuyordu. Artik lobide
  // secilen sayi dogrudan hedeftir.
  test('kisi sayisi hedefi degistirmez', () => {
    for (const kisi of [2, 3, 4]) {
      const { oda } = odaKur(kisi, { hedef: 12 });
      assert.strictEqual(oda.game.hedefPuan, 12,
        kisi + ' kisilik odada hedef degismis olmamali');
    }
  });

  test('bot eklemek hedefi oynatmaz', () => {
    const { oda } = odaKur(1, { hedef: 12 });
    const once = oda.game.snapshot().hedef;
    oda.botEkle();
    oda.botEkle();
    assert.strictEqual(oda.game.snapshot().hedef, once,
      'bot eklenince ekrandaki hedef degisti');
  });

  test('hedef snapshotta yayinlanir', () => {
    const { oda } = odaKur(4, { hedef: 12 });
    const s = oda.game.snapshot();
    assert.strictEqual(s.needed, 12, 'lobideki ayar');
    assert.strictEqual(s.hedef, 12, 'puan hedefi ayarin ta kendisi');
  });
});

describe('Sampiyon secimi', () => {
  test('hedefe tek basina ulasan sampiyon olur', () => {
    const { oda, oyuncular } = odaKur(4, { hedef: 1 });   // hedef 3 puan
    for (const p of oyuncular) oda.game.setReady(p, true);
    oyuncular[1].wins = 3;
    oda.game.phase = 'result';
    oda.game.afterResult();
    assert.strictEqual(oda.game.phase, 'gameover');
    assert.strictEqual(oda.game.winner, 'p1');
  });

  test('iki kisi ayni puanla ulasirsa mac devam eder', () => {
    // Sampiyonluk oyuncu siralamasina gore kurayla verilmemeli.
    const { oda, oyuncular } = odaKur(4, { hedef: 1 });
    for (const p of oyuncular) oda.game.setReady(p, true);
    oyuncular[0].wins = 3;
    oyuncular[2].wins = 3;
    oda.game.phase = 'result';
    oda.game.afterResult();
    assert.strictEqual(oda.game.phase, 'intro', 'mac surmeli');
    assert.strictEqual(oda.game.winner, null);
  });

  test('hedefi asan tek kisi varsa o sampiyon', () => {
    const { oda, oyuncular } = odaKur(4, { hedef: 1 });
    for (const p of oyuncular) oda.game.setReady(p, true);
    oyuncular[0].wins = 5;         // hedefin uzerinde
    oyuncular[2].wins = 3;
    oda.game.phase = 'result';
    oda.game.afterResult();
    assert.strictEqual(oda.game.phase, 'gameover');
    assert.strictEqual(oda.game.winner, 'p0');
  });
});

describe('Mini oyunlarin derece() metodu', () => {
  test('hepsi derece() sunuyor', () => {
    for (const mg of MINIGAMES) {
      const inst = mg.create(['p0', 'p1'], 0, {});
      assert.strictEqual(typeof inst.derece, 'function', mg.id + ': derece() eksik');
    }
  });

  test('derece() butun oyunculari tam olarak bir kez icerir', () => {
    for (const mg of MINIGAMES) {
      for (const kisi of [2, 3, 4]) {
        const ids = [];
        for (let i = 0; i < kisi; i++) ids.push('p' + i);
        const inst = mg.create(ids, 0, {});
        if (inst.start) inst.start();

        // Once bos durumda, sonra biraz oynanmis durumda kontrol et
        for (const asama of ['baslangic', 'oynanmis']) {
          if (asama === 'oynanmis') {
            for (let k = 0; k < 60; k++) {
              inst.input('p0', 'press', 120, 30);
              inst.input('p0', 'dir', 'left');
              inst.input('p0', 'grab', { x: 40 + (k * 29) % 240, y: 60 + (k * 13) % 100 });
              inst.input('p0', 'drop', { x: 250, y: 100 });
              inst.update(DT);
            }
          }
          const gruplar = inst.derece();
          assert.ok(Array.isArray(gruplar), mg.id + ': derece dizi dondurmeli');
          const duz = gruplar.flat();
          assert.strictEqual(duz.length, kisi,
            mg.id + '/' + kisi + ' kisi/' + asama + ': oyuncu sayisi tutmuyor');
          assert.strictEqual(new Set(duz).size, kisi,
            mg.id + ': ayni oyuncu birden fazla grupta');
          for (const id of ids) {
            assert.ok(duz.includes(id), mg.id + ': ' + id + ' siralamada yok');
          }
        }
      }
    }
  });

  test('derece() ile winners() birbiriyle tutarli', () => {
    // winners() bos olmadiginda, ilk derece grubuyla ayni olmali.
    for (const mg of MINIGAMES) {
      for (let deneme = 0; deneme < 5; deneme++) {
        const ids = ['p0', 'p1', 'p2', 'p3'];
        const inst = mg.create(ids, 0, {});
        if (inst.start) inst.start();
        let kalan = (inst.sure || mg.duration) + 0.5;
        let k = 0;
        while (kalan > 0 && !inst.done()) {
          k++;
          for (let i = 0; i < ids.length; i++) {
            if (k % (i + 1) !== 0) continue;         // oyunculari farklilastir
            inst.input(ids[i], 'press', 100 + i * 50, 30);
            inst.input(ids[i], 'dir', ['left', 'right', 'up', 'down'][(k + i) % 4]);
            inst.input(ids[i], 'grab', { x: 20 + (k * (3 + i)) % 290, y: 40 + (k * 7) % 130 });
            inst.input(ids[i], 'drop', { x: 250, y: 100 });
          }
          inst.update(DT);
          kalan -= DT;
        }
        const kazananlar = inst.winners();
        if (!kazananlar.length) continue;            // berabere: karsilastirma yok
        const ilkGrup = inst.derece()[0];
        assert.deepStrictEqual([...kazananlar].sort(), [...ilkGrup].sort(),
          mg.id + ': winners() ile derece()[0] uyusmuyor');
      }
    }
  });
});

describe('Siralama yardimcisi', () => {
  test('kucuk olcu once gelir, esitler gruplanir', () => {
    const olculer = { a: 5, b: 1, c: 5, d: 3 };
    assert.deepStrictEqual(
      dereceler(['a', 'b', 'c', 'd'], (id) => olculer[id]),
      [['b'], ['d'], ['a', 'c']]);
  });

  test('tek oyuncu ve bos liste', () => {
    assert.deepStrictEqual(dereceler(['a'], () => 0), [['a']]);
    assert.deepStrictEqual(dereceler([], () => 0), []);
  });

  test('cok kucuk farklar esit sayilir', () => {
    assert.deepStrictEqual(
      dereceler(['a', 'b'], (id) => (id === 'a' ? 1 : 1 + 1e-12)), [['a', 'b']]);
  });
});
