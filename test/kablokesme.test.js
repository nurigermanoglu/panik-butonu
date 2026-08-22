'use strict';
// KABLO KESME - iki asamali ezber oyunu.
//   1) gosterim: renkler tek tek gosterilir, kablolar henuz kesilemez
//   2) kesme   : sira EZBERDEN kesilir; yanlis kesim basa sarar

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, ilerlet } = require('./yardimci');
const wc = require('../server/minigames/wirecut');

function yeni(kisi) {
  const ids = [];
  for (let i = 0; i < (kisi || 2); i++) ids.push('p' + i);
  return wc.create(ids, 0);
}
function kesmeye(inst) { ilerlet(inst, inst.gosterim + 0.1); }
function dokun(inst, pid, wireIdx) {
  inst.input(pid, 'grab', { x: inst.wires[wireIdx].x, y: 100 });
}
// Su anki adimda YANLIS olan, henuz kesilmemis bir kablo bul.
// (Son adimda kalan tek kablo zaten dogru olandir - orada yanilmak mumkun degil.)
function yanlisKablo(inst, pid) {
  const me = inst.pl[pid];
  for (let i = me.prog + 1; i < inst.order.length; i++) {
    if (me.cut.indexOf(inst.order[i]) < 0) return inst.order[i];
  }
  return -1;
}

describe('Gosterim asamasi', () => {
  test('tur gosterimle baslar ve kablolar kesilemez', () => {
    const inst = yeni();
    assert.strictEqual(inst.snap().showing, true);
    for (let i = 0; i < 60; i++) {
      dokun(inst, 'p0', inst.order[0]);        // DOGRU kablo bile sayilmamali
      inst.update(DT);
    }
    assert.strictEqual(inst.pl.p0.prog, 0, 'gosterim sirasinda kesim sayildi');
    assert.strictEqual(inst.pl.p0.pen, 0, 'gosterim sirasinda ceza verildi');
  });

  test('gosterim bitince kablolar acilir', () => {
    const inst = yeni();
    kesmeye(inst);
    assert.strictEqual(inst.snap().showing, false);
    dokun(inst, 'p0', inst.order[0]);
    assert.strictEqual(inst.pl.p0.prog, 1);
  });

  test('renkler sirayla ve birer kez gosterilir', () => {
    const inst = yeni();
    const dizi = [];
    let son = -1;
    for (let i = 0; i < Math.round(inst.gosterim / DT) + 2; i++) {
      const gi = inst.gosterilen();
      if (gi >= 0 && gi !== son) { dizi.push(gi); son = gi; }
      if (gi < 0) son = -1;
      inst.update(DT);
    }
    assert.deepStrictEqual(dizi, [0, 1, 2, 3, 4]);
  });

  test('ezberleme suresi kesme suresinden calmaz', () => {
    const yavas = wc.create(['p0'], 0);
    const hizli = wc.create(['p0'], 1);
    assert.ok(hizli.gosterim < yavas.gosterim, 'gosterim hizlanmali');
    assert.ok(Math.abs((yavas.sure - yavas.gosterim) - 9) < 0.01,
      'seviye 0 kesme suresi 9 sn olmali');
    assert.ok(hizli.sure < yavas.sure, 'tur toplamda kisalmali');
  });
});

describe('Sira gizliligi', () => {
  test('paketler hicbir asamada tum sirayi tasimaz', () => {
    // Sira istemciye gitseydi konsolu acan biri cevabi okur, ezberlemenin
    // anlami kalmazdi.
    for (const seviye of [0, 1]) {
      const inst = wc.create(['p0'], seviye);
      const gorulen = [];
      for (let i = 0; i < Math.round((inst.sure + 0.5) / DT); i++) {
        const s = inst.snap();
        assert.ok(!('order' in s), 'snap order alanini gonderiyor');
        if (s.cur) gorulen.push(s.cur);
        inst.update(DT);
      }
      assert.strictEqual(new Set(gorulen).size, 5, 'bes rengin hepsi gosterilmeli');
    }
  });
});

describe('Basa sarma', () => {
  test('yanlis kesim ilerlemeyi sifirlar ve kablolari onarir', () => {
    const inst = yeni();
    kesmeye(inst);
    dokun(inst, 'p0', inst.order[0]);
    dokun(inst, 'p0', inst.order[1]);
    assert.strictEqual(inst.pl.p0.prog, 2);

    dokun(inst, 'p0', yanlisKablo(inst, 'p0'));
    assert.strictEqual(inst.pl.p0.prog, 0, 'ilerleme sifirlanmali');
    assert.deepStrictEqual(inst.pl.p0.cut, [], 'kesilenler onarilmali');
    assert.strictEqual(inst.pl.p0.enIyi, 2, 'ulasilan en iyi korunmali');
    assert.strictEqual(inst.pl.p0.sifir, 1);
    assert.ok(inst.pl.p0.pen > 0, 'makas da sikismali');
  });

  test('basa sardiktan sonra bastan kesip bitirebilir', () => {
    const inst = yeni();
    kesmeye(inst);
    dokun(inst, 'p0', inst.order[0]);
    dokun(inst, 'p0', yanlisKablo(inst, 'p0'));
    ilerlet(inst, inst.ceza + 0.1);
    // Onarilan kablolar tekrar kesilebilmeli, yoksa sira asla tamamlanamazdi
    for (const w of inst.order) { dokun(inst, 'p0', w); inst.update(DT); }
    assert.strictEqual(inst.pl.p0.prog, 5);
    assert.ok(inst.done());
    assert.deepStrictEqual(inst.winners(), ['p0']);
    assert.strictEqual(inst.text(), 'BOMBA ETKISIZ!');
  });

  test('ceza sirasinda kesim islemez', () => {
    const inst = yeni();
    kesmeye(inst);
    dokun(inst, 'p0', yanlisKablo(inst, 'p0'));
    dokun(inst, 'p0', inst.order[0]);
    assert.strictEqual(inst.pl.p0.prog, 0, 'ceza sirasinda dogru kablo da islememeli');
    ilerlet(inst, inst.ceza + 0.1);
    dokun(inst, 'p0', inst.order[0]);
    assert.strictEqual(inst.pl.p0.prog, 1, 'ceza bitince tekrar kesebilmeli');
  });

  test('son adimda yanilmak mumkun degil', () => {
    const inst = yeni();
    kesmeye(inst);
    for (let i = 0; i < 4; i++) dokun(inst, 'p0', inst.order[i]);
    assert.strictEqual(yanlisKablo(inst, 'p0'), -1, 'kesilmemis yanlis kablo kalmamali');
  });
});

describe('Kazanan secimi', () => {
  test('kimse bitiremezse en cok ILERLEYEBILEN kazanir', () => {
    const inst = yeni();
    kesmeye(inst);
    for (let i = 0; i < 3; i++) dokun(inst, 'p0', inst.order[i]);
    dokun(inst, 'p0', yanlisKablo(inst, 'p0'));      // p0 basa sardi: prog 0, enIyi 3
    dokun(inst, 'p1', inst.order[0]);                // p1 sadece 1 kablo kesti

    // Anlik ilerlemeye bakilsaydi p1 (1) > p0 (0) cikardi; yani cok daha
    // ileri giden oyuncu kaybederdi.
    assert.deepStrictEqual(inst.winners(), ['p0']);
    assert.strictEqual(inst.text(), '3 / 5 KABLO');
  });

  test('herkes sifirlansa bile tur haksiz yere berabere kalmaz', () => {
    const inst = yeni();
    kesmeye(inst);
    for (let i = 0; i < 3; i++) dokun(inst, 'p0', inst.order[i]);
    for (let i = 0; i < 2; i++) dokun(inst, 'p1', inst.order[i]);
    dokun(inst, 'p0', yanlisKablo(inst, 'p0'));
    dokun(inst, 'p1', yanlisKablo(inst, 'p1'));
    assert.strictEqual(inst.pl.p0.prog, 0);
    assert.strictEqual(inst.pl.p1.prog, 0);
    assert.deepStrictEqual(inst.winners(), ['p0'], '3 > 2 oldugu icin p0');
  });

  test('esit ilerleyenler ve hic kesmeyenler berabere', () => {
    const esit = yeni();
    kesmeye(esit);
    dokun(esit, 'p0', esit.order[0]);
    dokun(esit, 'p1', esit.order[0]);
    assert.deepStrictEqual(esit.winners(), []);

    const bos = yeni();
    kesmeye(bos);
    assert.deepStrictEqual(bos.winners(), []);
    assert.strictEqual(bos.text(), 'KIMSE BITIREMEDI!');
  });
});
