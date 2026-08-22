'use strict';
// Butun mini oyunlarin ortak sozlesmesi + oyuna ozel kurallar.
//
// Yeni bir mini oyun eklendiginde bu dosyaya dokunmak gerekmez: asagidaki
// dongu server/minigames/index.js listesini oldugu gibi gezer.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT } = require('./yardimci');
const MINIGAMES = require('../server/minigames');
const puzzle = require('../server/minigames/puzzle');

describe('Ortak mini oyun sozlesmesi', () => {
  test('hepsi gerekli alanlari tasiyor', () => {
    const gorulenId = new Set();
    for (const mg of MINIGAMES) {
      assert.strictEqual(typeof mg.id, 'string', 'id eksik');
      assert.ok(!gorulenId.has(mg.id), 'ayni id iki kez: ' + mg.id);
      gorulenId.add(mg.id);
      assert.strictEqual(typeof mg.name, 'string', mg.id + ': name eksik');
      assert.strictEqual(typeof mg.instruction, 'string', mg.id + ': instruction eksik');
      assert.ok(['action', 'lr', 'dpad', 'pointer'].includes(mg.controls),
        mg.id + ': bilinmeyen kontrol semasi -> ' + mg.controls);
      assert.ok(mg.duration > 0, mg.id + ': duration gecersiz');
      assert.strictEqual(typeof mg.create, 'function', mg.id + ': create eksik');
    }
  });

  // Her oyun 2 ve 4 kisiyle, en yavas ve en hizli seviyede sonuna kadar
  // kosturulur. Rastgele girdi yagmuru altinda hicbiri cokmemeli.
  for (const mg of MINIGAMES) {
    test(mg.id + ' - rastgele girdi altinda sonuna kadar kosuyor', () => {
      for (const kisi of [2, 4]) {
        for (const seviye of [0, 0.5, 1]) {
          const ids = [];
          for (let i = 0; i < kisi; i++) ids.push('p' + i);

          const inst = mg.create(ids, seviye, {});
          if (inst.start) inst.start();

          let kalan = (inst.sure || mg.duration) + 1;
          let adim = 0;
          while (kalan > 0 && !inst.done()) {
            adim++;
            for (const id of ids) {
              inst.input(id, 'press', 120, 30);
              inst.input(id, 'dir', ['up', 'down', 'left', 'right'][adim % 4]);
              inst.input(id, 'grab', { x: 20 + (adim * 31) % 280, y: 40 + (adim * 17) % 130 });
              inst.input(id, 'drag', { x: 250, y: 100 });
              inst.input(id, 'drop', { x: 250, y: 100 });
              // Bozuk paketler de gelebilir; oyun bunlara dayanmali
              inst.input(id, 'grab', null);
              inst.input(id, 'drop', { x: NaN, y: NaN });
              inst.input(id, 'bilinmeyen', 1);
            }
            inst.update(DT);
            JSON.stringify(inst.snap());        // snap her zaman serilestirilebilmeli
            kalan -= DT;
          }

          const kazananlar = inst.winners();
          assert.ok(Array.isArray(kazananlar), mg.id + ': winners dizi dondurmeli');
          for (const id of kazananlar) {
            assert.ok(ids.includes(id), mg.id + ': winners odada olmayan oyuncu dondurdu');
          }
          assert.strictEqual(typeof inst.text(), 'string', mg.id + ': text metin dondurmeli');
        }
      }
    });
  }

  test('hepsi hizlandikca kisaliyor (refleks haric)', () => {
    for (const mg of MINIGAMES) {
      const yavas = mg.create(['p0', 'p1'], 0, {});
      const hizli = mg.create(['p0', 'p1'], 1, {});
      const s0 = yavas.sure || mg.duration;
      const s1 = hizli.sure || mg.duration;
      assert.ok(s1 <= s0, mg.id + ': hizli seviye daha uzun surmemeli');
    }
  });
});

describe('Puzzle resim torbasi', () => {
  test('her odanin torbasi ayri', () => {
    // Torba modul seviyesinde tutulunca ayni anda oynayan odalar tek torbayi
    // paylasiyor ve "resimler sirayla gelsin" garantisi bozuluyordu.
    for (let deneme = 0; deneme < 100; deneme++) {
      const odaA = {}, odaB = {};
      const a1 = puzzle.create(['p0'], 0, odaA).img;
      const b1 = puzzle.create(['p0'], 0, odaB).img;
      const a2 = puzzle.create(['p0'], 0, odaA).img;
      const b2 = puzzle.create(['p0'], 0, odaB).img;
      assert.notStrictEqual(a1, a2, 'A odasinda ayni resim ust uste geldi');
      assert.notStrictEqual(b1, b2, 'B odasinda ayni resim ust uste geldi');
    }
  });

  test('hafiza verilmezse de cokmez', () => {
    assert.ok(puzzle.create(['p0'], 0).img >= 0);
  });
});
