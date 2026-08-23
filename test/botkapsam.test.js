'use strict';
// BOT KAPSAMI
//
// Bu dosya tek bir soruyu sorar: bot BUTUN oyunlari oynayabiliyor mu?
//
// Mini oyun listesini oldugu gibi gezer, yani yeni bir oyun eklendiginde
// otomatik olarak kapsama girer. Bir oyunda bot hic oynayamiyorsa (ya da
// kendine zarar veriyorsa) burasi kirmizi yanar.
//
// Olcut oyundan bagimsiz olsun diye derece() kullanilir: bot, hic oynamayan
// bir rakibi yenebiliyor mu?

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, sahteConn } = require('./yardimci');
const { Room } = require('../server/room');
const MINIGAMES = require('../server/minigames');

// Bir turu bot ile PASIF bir insan arasinda oynatir, botun derecesini doner.
// 0 = bot birinci (ya da esit birinci)
function turOynat(mg, zorluk) {
  const oda = new Room('T');
  const insan = oda.add(sahteConn(), 'AYSE', 'c0');   // hic girdi vermez
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

  const gruplar = oda.game.inst.derece();
  for (let i = 0; i < gruplar.length; i++) {
    if (gruplar[i].indexOf(bot.id) >= 0) return { sira: i, tekBasina: gruplar[i].length === 1 };
  }
  return { sira: 99, tekBasina: false };
}

describe('Bot butun oyunlari oynayabiliyor', () => {
  for (const mg of MINIGAMES) {
    test(mg.id + ' - zor bot pasif rakibi yeniyor', () => {
      const DENEME = 25;
      let birinci = 0;
      for (let n = 0; n < DENEME; n++) {
        if (turOynat(mg, 2).sira === 0) birinci++;
      }
      // Hicbir sey yapmayan bir rakibe karsi bot cogu turu almali.
      // Alamiyorsa o oyunda bot ya oynamiyor ya da kendine zarar veriyor.
      assert.ok(birinci >= DENEME * 0.8,
        mg.id + ': zor bot ' + DENEME + ' turun sadece ' + birinci +
        " tanesinde onde bitirdi - bu oyunda bot oynayamiyor olabilir");
    });
  }
});

describe('Zorluk her oyunda dogru yonde', () => {
  for (const mg of MINIGAMES) {
    test(mg.id + ' - zor bot kolay bottan geri kalmiyor', () => {
      const DENEME = 25;
      let kolay = 0, zor = 0;
      for (let n = 0; n < DENEME; n++) {
        if (turOynat(mg, 0).sira === 0) kolay++;
        if (turOynat(mg, 2).sira === 0) zor++;
      }
      // Zor botun kolay bottan KOTU olmamasi yeterli: bazi oyunlarda ikisi
      // de tavana vuruyor (fark bitirme suresine yansiyor, skora degil).
      assert.ok(zor >= kolay,
        mg.id + ': kolay bot ' + kolay + ', zor bot ' + zor + ' tur kazandi');
    });
  }
});

describe('Oyuna ozel bot sunanlar', () => {
  test('ozel bot sunan oyunlarin listesi', () => {
    const ozel = [];
    for (const mg of MINIGAMES) {
      const inst = mg.create(['p0', 'p1'], 0, {});
      if (inst.botHamle) ozel.push(mg.id);
    }
    // Bu oyunlarda genel davranis yetersizdi; ozel bot yazildi.
    // Liste degisirse (biri kaldirilirsa) haberimiz olsun.
    assert.deepStrictEqual(ozel.sort(), [
      'collect', 'dodge', 'floor', 'memory', 'mole', 'puzzle', 'shapesort',
      'tersemir', 'wirecut',
    ]);
  });

  test('izleme gerektiren oyunlar botIzle sunuyor', () => {
    const izleyen = [];
    for (const mg of MINIGAMES) {
      const inst = mg.create(['p0', 'p1'], 0, {});
      if (inst.botIzle) izleyen.push(mg.id);
    }
    assert.deepStrictEqual(izleyen.sort(), ['memory', 'wirecut']);
  });

  test('ozel bot sunmayanlar genel davranisla idare ediyor', () => {
    // race, reflex, hotpotato, filedelete: kontrol semasina gore rastgele
    // hamle yeterli. Yukaridaki kapsam testi bunu zaten dogruluyor.
    const genel = [];
    for (const mg of MINIGAMES) {
      const inst = mg.create(['p0', 'p1'], 0, {});
      if (!inst.botHamle) genel.push(mg.id);
    }
    assert.deepStrictEqual(genel.sort(), ['filedelete', 'hotpotato', 'race', 'reflex']);
  });
});
