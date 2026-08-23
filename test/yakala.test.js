'use strict';
// DUSENLERI YAKALA
//
// Kritik iddia: bombadan kacacak yer her zaman vardir. Ayni anda en fazla 2
// esya duser ve ikisi ayni seritte olmaz; 5 serit oldugu icin en az 3 serit
// bos kalir.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, ilerlet } = require('./yardimci');
const collect = require('../server/minigames/collect');

// Esyanin yakalama cizgisine varmasini bekler
function cizgiyeKadar(inst, item) {
  let guvenlik = 0;
  while (item.y < 148 && guvenlik < 2000) { inst.update(DT); guvenlik++; }
}

describe('Dusme programinin adaleti', () => {
  test('ayni anda en fazla 2 esya ve ayni seritte iki tane yok', () => {
    for (const sv of [0, 0.5, 1]) {
      for (let i = 0; i < 80; i++) {
        const inst = collect.create(['p0'], sv);
        const anlar = {};
        for (const p of inst.plan) {
          const anahtar = p.t.toFixed(3);
          anlar[anahtar] = anlar[anahtar] || [];
          anlar[anahtar].push(p.lane);
        }
        for (const an in anlar) {
          const seritler = anlar[an];
          assert.ok(seritler.length <= 2,
            'ayni anda ' + seritler.length + ' esya dustu');
          assert.strictEqual(new Set(seritler).size, seritler.length,
            'ayni serite iki esya dustu: ' + seritler.join(','));
        }
      }
    }
  });

  test('her an bombasiz bir serit kaliyor', () => {
    // Bombadan kacacak yer olmali: ayni anda dusen bombalar tum seritleri
    // kapatmamali.
    for (const sv of [0, 1]) {
      for (let i = 0; i < 80; i++) {
        const inst = collect.create(['p0'], sv);
        const anlar = {};
        for (const p of inst.plan) {
          if (!p.bomba) continue;
          const anahtar = p.t.toFixed(3);
          anlar[anahtar] = (anlar[anahtar] || 0) + 1;
        }
        for (const an in anlar) {
          assert.ok(anlar[an] < inst.lanes,
            'bir anda ' + anlar[an] + ' bomba, ' + inst.lanes + ' serit');
        }
      }
    }
  });

  test('program tur boyunca suruyor', () => {
    for (const sv of [0, 1]) {
      const inst = collect.create(['p0'], sv);
      const son = Math.max(...inst.plan.map((p) => p.t));
      assert.ok(son > inst.sure * 0.7,
        'son esya turun %' + Math.round(son / inst.sure * 100) + "'inde dusuyor");
      assert.ok(inst.plan.length >= 15, 'cok az esya: ' + inst.plan.length);
    }
  });
});

describe('Yakalama', () => {
  test('dogru seritteki oyuncu yildizi alir', () => {
    const inst = collect.create(['p0', 'p1'], 0);
    inst.plan = [{ t: 0.1, lane: 2, bomba: false, v: 108 }];
    inst.sirada = 0;
    inst.pl.p0.lane = 2;
    inst.pl.p1.lane = 4;
    ilerlet(inst, 2.5);
    assert.strictEqual(inst.pl.p0.score, 1, 'seritteki oyuncu almali');
    assert.strictEqual(inst.pl.p1.score, 0, 'baska seritteki almamali');
  });

  test('bomba puan dusurur', () => {
    const inst = collect.create(['p0', 'p1'], 0);
    inst.plan = [{ t: 0.1, lane: 1, bomba: true, v: 108 }];
    inst.sirada = 0;
    inst.pl.p0.lane = 1;
    inst.pl.p1.lane = 3;
    ilerlet(inst, 2.5);
    assert.strictEqual(inst.pl.p0.score, -2, 'bomba -2 olmali');
    assert.strictEqual(inst.pl.p1.score, 0);
  });

  test('ayni seritteki HERKES ayni esyayi alir', () => {
    // Tek kisiye verilseydi "once kim geldi" sorusu ping'e bagli olurdu.
    const inst = collect.create(['p0', 'p1', 'p2'], 0);
    inst.plan = [{ t: 0.1, lane: 0, bomba: false, v: 108 }];
    inst.sirada = 0;
    inst.pl.p0.lane = 0;
    inst.pl.p1.lane = 0;
    inst.pl.p2.lane = 3;
    ilerlet(inst, 2.5);
    assert.strictEqual(inst.pl.p0.score, 1);
    assert.strictEqual(inst.pl.p1.score, 1, 'ayni seritteki ikinci oyuncu da almali');
    assert.strictEqual(inst.pl.p2.score, 0);
  });

  test('esya bir kez sayilir', () => {
    const inst = collect.create(['p0'], 0);
    inst.plan = [{ t: 0.1, lane: 2, bomba: false, v: 108 }];
    inst.sirada = 0;
    inst.pl.p0.lane = 2;
    ilerlet(inst, 4);
    assert.strictEqual(inst.pl.p0.score, 1, 'esya iki kez sayildi');
  });

  test('cizgiyi gecmemis esya puan vermez', () => {
    const inst = collect.create(['p0'], 0);
    inst.plan = [{ t: 0.1, lane: 2, bomba: false, v: 108 }];
    inst.sirada = 0;
    inst.pl.p0.lane = 2;
    ilerlet(inst, 0.5);            // henuz inmedi
    assert.strictEqual(inst.pl.p0.score, 0);
  });
});

describe('Hareket', () => {
  test('serit sinirlari asilmaz', () => {
    const inst = collect.create(['p0'], 0);
    inst.pl.p0.lane = 0;
    inst.input('p0', 'dir', 'left');
    assert.strictEqual(inst.pl.p0.lane, 0);
    inst.pl.p0.lane = inst.lanes - 1;
    inst.input('p0', 'dir', 'right');
    assert.strictEqual(inst.pl.p0.lane, inst.lanes - 1);
  });

  test('oyuncular farkli seritlerden baslar', () => {
    for (const kisi of [2, 3, 4]) {
      const ids = [];
      for (let i = 0; i < kisi; i++) ids.push('p' + i);
      const inst = collect.create(ids, 0);
      const yerler = ids.map((id) => inst.pl[id].lane);
      assert.strictEqual(new Set(yerler).size, kisi, 'ayni seritten basladilar');
    }
  });

  test('bilinmeyen girdi yok sayilir', () => {
    const inst = collect.create(['p0'], 0);
    const yer = inst.pl.p0.lane;
    inst.input('p0', 'dir', 'up');
    inst.input('p0', 'press', 1);
    inst.input('p0', 'grab', { x: 5, y: 5 });
    assert.strictEqual(inst.pl.p0.lane, yer);
  });
});

describe('Sonuc', () => {
  test('en cok toplayan kazanir', () => {
    const inst = collect.create(['p0', 'p1'], 0);
    inst.pl.p0.score = 5; inst.pl.p0.yildiz = 5;
    inst.pl.p1.score = 2;
    assert.deepStrictEqual(inst.winners(), ['p0']);
    assert.deepStrictEqual(inst.derece(), [['p0'], ['p1']]);
    assert.strictEqual(inst.text(), '5 YILDIZ!');
  });

  test('bomba sayisi sonuc yazisinda gorunur', () => {
    const inst = collect.create(['p0', 'p1'], 0);
    inst.pl.p0.score = 3; inst.pl.p0.yildiz = 5; inst.pl.p0.bomba = 1;
    inst.pl.p1.score = 1;
    assert.strictEqual(inst.text(), '5 YILDIZ! (1 BOMBA)');
  });

  test('kimse toplayamazsa berabere', () => {
    const inst = collect.create(['p0', 'p1'], 0);
    assert.deepStrictEqual(inst.winners(), []);
    assert.strictEqual(inst.text(), 'KIMSE TOPLAYAMADI!');
  });

  test('negatif skorlar da siralanir', () => {
    // winners() bos donse bile derece() puan dagitimi icin sira vermeli.
    const inst = collect.create(['p0', 'p1'], 0);
    inst.pl.p0.score = -2;
    inst.pl.p1.score = -6;
    assert.deepStrictEqual(inst.winners(), [], 'kimse artida degil');
    assert.deepStrictEqual(inst.derece(), [['p0'], ['p1']], 'az kaybeden onde');
  });
});
