'use strict';
// FINAL TURU
//
// Biri tek turda sampiyonlugu alabilecek duruma geldiginde sonraki tur
// "final turu" olur: puanlar iki katina cikar, geride kalanlarin son sansi.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { odaKur } = require('./yardimci');

// Odayi mac fazina alip sabit derece donduren sahte bir ornek yerlestirir.
function turKur(kisi, hedefAyar) {
  const { oda, oyuncular } = odaKur(kisi, { hedef: hedefAyar });
  for (const p of oyuncular) oda.game.setReady(p, true);
  return { oda, oyuncular };
}

function turOynat(oda, gruplar) {
  oda.game.inst = {
    derece: () => gruplar,
    winners: () => (gruplar.length > 1 ? gruplar[0] : []),
    text: () => '',
  };
  oda.game.puanDagit();
}

describe('Final turu kosulu', () => {
  test('mac basinda final turu ilan edilmez', () => {
    const { oda } = turKur(4, 5);          // hedef 15
    assert.strictEqual(oda.game.finalTuru, false, 'herkes 0 puandayken final olmamali');
  });

  test('kucuk hedefte bile mac basinda final ilan edilmez', () => {
    // Asil sinir durumu bu: 2 kisi + ayar 1 -> hedef 1 puan. Herkes 0 iken
    // 0 + 1 >= 1 saglandigi icin "enYuksek > 0" korumasi olmasa daha ilk
    // turdan final ilan edilirdi.
    for (const [kisi, ayar] of [[2, 1], [3, 1], [4, 1]]) {
      const { oda } = turKur(kisi, ayar);
      assert.strictEqual(oda.game.finalTuru, false,
        kisi + ' kisi + ayar ' + ayar + ': mac basinda final ilan edildi');
    }
  });

  test('kucuk hedefte ilk puandan sonra final baslar', () => {
    const { oda, oyuncular } = turKur(2, 1);   // hedef 1
    oyuncular[0].wins = 1;
    assert.strictEqual(oda.game.finalTuru, true);
  });

  test('tek turda hedefe ulasilabiliyorsa final turu', () => {
    const { oda, oyuncular } = turKur(4, 5);     // hedef 15, tur basi en fazla 3
    oyuncular[0].wins = 11;
    assert.strictEqual(oda.game.finalTuru, false, '11 + 3 = 14 < 15');
    oyuncular[0].wins = 12;
    assert.strictEqual(oda.game.finalTuru, true, '12 + 3 = 15 -> final');
  });

  test('iki kisilik odada da dogru hesaplanir', () => {
    const { oda, oyuncular } = turKur(2, 5);     // hedef 5, tur basi en fazla 1
    oyuncular[0].wins = 3;
    assert.strictEqual(oda.game.finalTuru, false, '3 + 1 = 4 < 5');
    oyuncular[0].wins = 4;
    assert.strictEqual(oda.game.finalTuru, true, '4 + 1 = 5 -> final');
  });
});

describe('Cift puan', () => {
  test('final turunda puanlar iki katina cikar', () => {
    const { oda, oyuncular } = turKur(4, 5);
    oda.game.final = true;
    turOynat(oda, [['p0'], ['p1'], ['p2'], ['p3']]);
    assert.deepStrictEqual(oyuncular.map((p) => p.wins), [6, 4, 2, 0],
      'normalde 3/2/1/0 olacakti');
  });

  test('normal turda carpan uygulanmaz', () => {
    const { oda, oyuncular } = turKur(4, 5);
    oda.game.final = false;
    turOynat(oda, [['p0'], ['p1'], ['p2'], ['p3']]);
    assert.deepStrictEqual(oyuncular.map((p) => p.wins), [3, 2, 1, 0]);
  });

  test('berabere turda final olsa da puan verilmez', () => {
    const { oda, oyuncular } = turKur(4, 5);
    oda.game.final = true;
    turOynat(oda, [['p0', 'p1', 'p2', 'p3']]);
    assert.deepStrictEqual(oyuncular.map((p) => p.wins), [0, 0, 0, 0]);
  });

  test('esit derecedekiler cift puani da paylasir', () => {
    const { oda, oyuncular } = turKur(4, 5);
    oda.game.final = true;
    turOynat(oda, [['p0'], ['p1', 'p2'], ['p3']]);
    assert.deepStrictEqual(oyuncular.map((p) => p.wins), [6, 4, 4, 0]);
  });
});

describe('Tur akisi', () => {
  test('bayrak tur basinda sabitlenir', () => {
    const { oda, oyuncular } = turKur(4, 5);
    oyuncular[0].wins = 12;                 // final kosulu saglandi
    oda.game.nextRound();
    assert.strictEqual(oda.game.final, true);
    // Tur ortasinda puan degisse bile bayrak degismemeli
    oyuncular[0].wins = 0;
    assert.strictEqual(oda.game.final, true, 'bayrak tur ortasinda degisti');
  });

  test('final bayragi snapshotta yayinlanir', () => {
    const { oda, oyuncular } = turKur(4, 5);
    oyuncular[0].wins = 12;
    oda.game.nextRound();
    assert.strictEqual(oda.game.snapshot().final, true);
  });

  test('lobiye donunce bayrak sifirlanir', () => {
    const { oda, oyuncular } = turKur(4, 5);
    oyuncular[0].wins = 12;
    oda.game.nextRound();
    assert.strictEqual(oda.game.final, true);
    oda.game.toLobby(null);
    assert.strictEqual(oda.game.final, false);
  });

  test('final turu geride kalana gercekten sans veriyor', () => {
    // 4 kisi, hedef 15. Onde olan 12, geride olan 6.
    // Normal turda geride olan en fazla 3 alir -> 9. Final turunda 6 -> 12.
    const { oda, oyuncular } = turKur(4, 5);
    oyuncular[0].wins = 12;
    oyuncular[1].wins = 6;
    oda.game.nextRound();
    assert.strictEqual(oda.game.final, true);
    turOynat(oda, [['p1'], ['p0'], ['p2'], ['p3']]);   // geride olan turu kazandi
    assert.strictEqual(oyuncular[1].wins, 12, 'geride olan 6 puan almali');
    assert.strictEqual(oyuncular[0].wins, 16, 'onde olan 4 puan alip hedefi gecti');
  });
});
