'use strict';
// EZBER OYUNUNDA BOT
//
// Hafiza Dizisi ezber gerektiriyor. Genel bot rastgele hamle yaptigi icin
// bu oyunda neredeyse hic ilerleyemiyordu. Artik bot da insan gibi ekrani
// IZLIYOR: gosterim sirasinda sembolleri sirayla akilda tutuyor, sonra
// tekrarliyor.
//
// NOT: Kablo Kesme eskiden ikinci ezber oyunuydu, artik bir ZAMANLAMA
// oyunu - onun testleri test/kablokesme.test.js'de.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, sahteConn } = require('./yardimci');
const { Room } = require('../server/room');
const memory = require('../server/minigames/memory');

// Bir mini oyunu bot ile sonuna kadar oynatir
function oynat(mg, zorluk) {
  const oda = new Room('T');
  const insan = oda.add(sahteConn(), 'AYSE', 'c0');
  const bot = oda.botEkle();
  oda.botZorluk = zorluk;
  oda.game.mg = mg;
  oda.game.inst = mg.create([insan.id, bot.id], 0, {});
  oda.game.phase = 'play';
  if (oda.game.inst.start) oda.game.inst.start();
  let kalan = oda.game.inst.sure || mg.duration;
  while (kalan > 0 && !oda.game.inst.done()) {
    oda.game.botTick(DT);
    oda.game.inst.update(DT);
    kalan -= DT;
  }
  return { inst: oda.game.inst, botId: bot.id };
}

describe('Izleme altyapisi', () => {
  test('ezber oyunu botIzle sunuyor', () => {
    for (const mg of [memory]) {
      const inst = mg.create(['p0'], 0);
      assert.strictEqual(typeof inst.botIzle, 'function', mg.id + ': botIzle eksik');
      assert.strictEqual(typeof inst.botHamle, 'function', mg.id + ': botHamle eksik');
    }
  });

  test('bot gosterim sirasinda diziyi ogreniyor', () => {
    const inst = memory.create(['p0'], 0);
    let guvenlik = 0;
    while (inst.showing && guvenlik < 3000) {
      inst.botIzle('p0', inst.snap());
      inst.update(DT);
      guvenlik++;
    }
    const ogrenilen = inst.botHafiza.p0.dizi;
    assert.deepStrictEqual(ogrenilen, inst.seq,
      'bot dizinin tamamini dogru ogrenmedi');
  });

  test('ayni sembol iki kez gelirse ikisi de kaydedilir', () => {
    // "Bosluktan sembole" gecisleri sayiyoruz; ayni sembol arka arkaya
    // gelse bile arada bosluk oldugu icin ayirt edilir.
    const inst = memory.create(['p0'], 0);
    const h = { dizi: [], onceki: null };
    inst.botHafiza.p0 = h;
    const izle = (cur) => inst.botIzle('p0', { showing: true, cur: cur });
    izle('up'); izle('up'); izle(null); izle('up'); izle('up');
    assert.deepStrictEqual(h.dizi, ['up', 'up'], 'tekrar eden sembol kaydedilmedi');
  });
});

describe('Hamle kurallari', () => {
  test('gosterim surerken hamle yapilmaz', () => {
    const inst = memory.create(['p0', 'p1'], 0);
    inst.botHafiza.p0 = { dizi: ['up', 'down'], onceki: null };
    inst.botHamle('p0', inst.snap(), 2);
    assert.strictEqual(inst.prog.p0, 0, 'gosterim sirasinda basildi');
  });

  test('elenen bot hamle yapmaz', () => {
    const inst = memory.create(['p0', 'p1'], 0);
    inst.showing = false;
    inst.out.p0 = true;
    inst.botHafiza.p0 = { dizi: inst.seq.slice(), onceki: null };
    const oncekiProg = inst.prog.p0;
    inst.botHamle('p0', inst.snap(), 2);
    assert.strictEqual(inst.prog.p0, oncekiProg);
  });

});

describe('Zorluk farki', () => {
  test('hafiza dizisinde zor bot belirgin ustun', () => {
    const olc = (z) => {
      let toplam = 0;
      for (let n = 0; n < 40; n++) toplam += oynat(memory, z).inst.prog.p1;
      return toplam / 40;
    };
    const kolay = olc(0), zor = olc(2);
    assert.ok(zor > kolay * 1.8,
      'zor bot belirgin onde olmali: kolay ' + kolay.toFixed(2) + ', zor ' + zor.toFixed(2));
    assert.ok(kolay > 0.8,
      'kolay bot bile eski genel bottan (0.3) iyi olmali: ' + kolay.toFixed(2));
  });

  test('zor bot diziyi tamamliyor', () => {
    let memoryBitti = 0;
    for (let n = 0; n < 30; n++) {
      const m = oynat(memory, 2);
      if (m.inst.prog[m.botId] >= m.inst.seq.length) memoryBitti++;
    }
    assert.ok(memoryBitti >= 25, 'hafiza dizisi tamamlama: ' + memoryBitti + '/30');
  });
});
