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
      'collect', 'dodge', 'filedelete', 'floor', 'memory', 'mole', 'puzzle',
      'shapesort', 'tersemir', 'wirecut',
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
    // race, reflex, hotpotato: kontrol semasina gore rastgele
    // hamle yeterli. Yukaridaki kapsam testi bunu zaten dogruluyor.
    const genel = [];
    for (const mg of MINIGAMES) {
      const inst = mg.create(['p0', 'p1'], 0, {});
      if (!inst.botHamle) genel.push(mg.id);
    }
    assert.deepStrictEqual(genel.sort(), ['hotpotato', 'race', 'reflex']);
  });
});

// Yukaridaki testler "bot oynayabiliyor mu" sorusunu soruyor. Bu bolum
// "ZOR bot gercekten iyi mi" sorusunu soruyor - cunku bot oynuyor ama kotu
// oynuyor olabiliyordu: Engelden Kac'ta zor bot 14 saniyelik sahanin ancak
// 7 saniyesini yasiyordu (yani turun yarisinda oluyordu).
describe('Zor bot gercekten iyi oynuyor', () => {
  // Botu gercek dongudeki gibi calistirir (botTick, hamle araliklari dahil).
  function oyna(mg, zorluk, seviye) {
    const oda = new Room('T');
    oda.add(sahteConn(), 'PASIF', 'c0');
    const bot = oda.botEkle();
    oda.botZorluk = zorluk;
    oda.game.mg = mg;
    oda.game.inst = mg.create(oda.players.map((p) => p.id), seviye, {});
    oda.game.phase = 'play';
    const inst = oda.game.inst;
    if (inst.start) inst.start();
    let kalan = inst.sure || mg.duration;
    while (kalan > 0 && !inst.done()) {
      oda.game.botTick(DT);
      inst.update(DT);
      kalan -= DT;
    }
    return { inst, id: bot.id, sure: inst.sure || mg.duration };
  }

  function ortalama(mg, zorluk, seviye, deneme, olc) {
    let t = 0;
    for (let i = 0; i < deneme; i++) t += olc(oyna(mg, zorluk, seviye));
    return t / deneme;
  }

  test('Engelden Kac - zor bot turun cogunu ayakta gecirir', () => {
    const dodge = MINIGAMES.find((m) => m.id === 'dodge');
    const yasam = (r) => (r.inst.pl[r.id].alive ? r.sure : r.inst.pl[r.id].deadAt);
    // Desen "her zaman gecilebilir" uretiliyor; iyi oynayan bir bot sonuna
    // kadar gitmeli. Esik 12 sn (turun %86'si): eski bot 11.4 sn'de kaliyordu,
    // ondan onceki hali 6.7 sn'de. Esigi asagi cekersek o iki gerileme de
    // testten gecerdi.
    const ort = ortalama(dodge, 2, 0.5, 60, yasam);
    assert.ok(ort >= 12,
      'zor bot ortalama ' + ort.toFixed(1) + ' sn yasiyor - 14 sn sahada bu az');
  });

  test('Dusenleri Yakala - zor bot orta bottan belirgin onde', () => {
    const collect = MINIGAMES.find((m) => m.id === 'collect');
    const skor = (r) => r.inst.pl[r.id].score;
    const orta = ortalama(collect, 1, 0.5, 60, skor);
    const zor = ortalama(collect, 2, 0.5, 60, skor);
    // Mutlak esik: usta bir insan simulasyonu 16.2 puan aliyor, zor bot da
    // o civarda olmali. Sadece 'ortadan iyi' demek yetmiyordu - eski bot
    // 13.3 puanla o kosulu da sagliyordu.
    assert.ok(zor >= 15,
      'zor bot ' + zor.toFixed(1) + ' puan aliyor (orta bot ' + orta.toFixed(1) + ')');
  });

  test('Dosya Silme - zor bot butun dosyalari siliyor', () => {
    const fd = MINIGAMES.find((m) => m.id === 'filedelete');
    const oran = (r) => r.inst.pl[r.id].score / r.inst.adet;
    const ort = ortalama(fd, 2, 0.5, 40, oran);
    assert.ok(ort >= 0.95,
      'zor bot dosyalarin ancak %' + Math.round(ort * 100) + "'ini siliyor");
  });
});

// Surukle-birak oyunlarinda (Dosya Silme, Sekil Yerlestir, Puzzle) bot gorevi
// HER zorlukta tamamliyor; fark yalnizca bitirme suresine yansiyor. Yani o
// sure dogrudan "insanin kazanma sansi" demek.
//
// Bot hamle araligina birakilinca zor bot Puzzle'i 0.4, Sekil Yerlestir'i 0.8,
// Dosya Silme'yi 1.6 saniyede bitiriyordu - oyun, insan ekrana dokunmadan
// bitiyordu. server/minigames/elhizi.js her surukleme icin bir insan eli
// suresi harciyor. Bu testler o modelin kaldirilmasini/bozulmasini yakalar.
describe('Surukle-birak: bot insan eli hizinda oynuyor', () => {
  function bitirmeSuresi(mg, zorluk, seviye, deneme) {
    let toplam = 0;
    for (let i = 0; i < deneme; i++) {
      const oda = new Room('T');
      oda.add(sahteConn(), 'PASIF', 'c0');
      const bot = oda.botEkle();
      oda.botZorluk = zorluk;
      oda.game.mg = mg;
      oda.game.inst = mg.create(oda.players.map((p) => p.id), seviye, {});
      oda.game.phase = 'play';
      const inst = oda.game.inst;
      let kalan = inst.sure || mg.duration;
      while (kalan > 0 && !inst.done()) {
        oda.game.botTick(DT);
        inst.update(DT);
        kalan -= DT;
      }
      toplam += inst.pl[bot.id].lastAt;
    }
    return toplam / deneme;
  }

  // Alt sinir: insanin ekrana dokunup en az bir hamle yapabilecegi sure.
  // Ust sinir: botun hala ciddi bir rakip olmasi.
  const BEKLENEN = [
    { id: 'puzzle', enAz: 2.2, enFazla: 5.5, parca: 3 },
    { id: 'shapesort', enAz: 3.0, enFazla: 6.5, parca: 5 },
    { id: 'filedelete', enAz: 4.5, enFazla: 9.0, parca: 9 },
  ];

  for (const b of BEKLENEN) {
    test(b.id + ' - zor bot ' + b.enAz + '-' + b.enFazla + ' sn arasinda bitiriyor', () => {
      const mg = MINIGAMES.find((m) => m.id === b.id);
      const sure = bitirmeSuresi(mg, 2, 0.5, 30);
      assert.ok(sure >= b.enAz,
        b.id + ': zor bot ' + sure.toFixed(1) + ' sn - insan ekrana dokunamadan bitiyor');
      assert.ok(sure <= b.enFazla,
        b.id + ': zor bot ' + sure.toFixed(1) + ' sn - bu kadar yavas bir bot rakip sayilmaz');
    });
  }

  test('zorluk bitirme suresine yansiyor', () => {
    // Bu uc oyunda skor tavana vurdugu icin zorlugun TEK gorunur etkisi
    // sure. Sira bozulursa zorluk secimi anlamsizlasir.
    for (const b of BEKLENEN) {
      const mg = MINIGAMES.find((m) => m.id === b.id);
      const orta = bitirmeSuresi(mg, 1, 0.5, 25);
      const zor = bitirmeSuresi(mg, 2, 0.5, 25);
      assert.ok(zor < orta,
        b.id + ': zor bot ' + zor.toFixed(1) + ' sn, orta bot ' + orta.toFixed(1) + ' sn');
    }
  });
});
