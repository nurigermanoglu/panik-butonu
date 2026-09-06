'use strict';
// KABLO KESME (zamanlama)
//
// Oyun yenilendi: eskiden "renk sirasini izle, ezberden kes" idi ve Hafiza
// Dizisi ile ayni turdu; ustelik turun ucte biri gosterim asamasinda,
// yani oyuncunun hicbir sey yapamadigi bir bekleyisle geciyordu.
// Yeni hali bir ZAMANLAMA oyunu: kivilcim makas bandindayken kes.
//
// En kritik iddia AYNI KALDI, sadece nesnesi degisti: tur kaybetmek SANSA
// degil oyuncunun kendi zamanlamasina bagli olmali. Bunu "kusursuz oyuncu"
// simulasyonuyla olcuyoruz - her kivilcimi bandin ortasinda kesen biri
// uretilen hicbir programda tek bir kivilcim bile kacirmamali.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT } = require('./yardimci');
const wirecut = require('../server/minigames/wirecut');

// Bandin ortasi - kusursuz oyuncunun nisan noktasi
function orta(inst) {
  const s = inst.snap();
  return s.ky + s.kh / 2;
}

// Her kivilcimi bandin ortasinda kesen oyuncu
function kusursuzOyna(seviye) {
  const inst = wirecut.create(['p0'], seviye, {});
  const o = orta(inst);
  let kalan = inst.sure;
  while (kalan > 0) {
    if (inst.pl.p0.pen <= 0) {
      for (const k of inst.aktifler()) {
        if (inst.pl.p0.kesilen[k.i]) continue;
        if (Math.abs(k.y - o) > inst.snap().kh / 2 - 2) continue;
        inst.input('p0', 'grab', { x: inst.wires[k.w].x, y: o });
      }
    }
    inst.update(DT);
    kalan -= DT;
  }
  return inst;
}

describe('Program adaleti', () => {
  test('kusursuz oyuncu hicbir kivilcimi kacirmaz', () => {
    // 300 desen. Bir tanesinde bile kacirma varsa program gecilemez
    // uretiliyor demektir ve oyun sansa baglanir.
    for (let n = 0; n < 300; n++) {
      const inst = kusursuzOyna(Math.random());
      const me = inst.pl.p0;
      assert.strictEqual(me.kesti, inst.kivilcimlar.length,
        'kusursuz oyuncu ' + me.kesti + '/' + inst.kivilcimlar.length + ' kesebildi');
      assert.strictEqual(me.bosa, 0, 'kusursuz oyuncu makasi sikistirdi');
    }
  });

  test('iki kivilcimin band penceresi cakismaz', () => {
    // Cakisirsa oyuncu ikisinden birini secmek zorunda kalir ve tavana
    // ulasmak imkansizlasir. Aralarinda tepki payi da olmali.
    for (let n = 0; n < 300; n++) {
      const inst = wirecut.create(['p0'], Math.random(), {});
      const k = inst.kivilcimlar;
      for (let i = 1; i < k.length; i++) {
        assert.ok(k[i].girer > k[i - 1].cikar,
          'pencereler cakisiyor: ' + k[i - 1].cikar.toFixed(2) + ' -> ' + k[i].girer.toFixed(2));
      }
    }
  });

  test('ayni kablodan ard arda kivilcim gelmez', () => {
    for (let n = 0; n < 300; n++) {
      const k = wirecut.create(['p0'], Math.random(), {}).kivilcimlar;
      for (let i = 1; i < k.length; i++) {
        assert.notStrictEqual(k[i].w, k[i - 1].w, 'ayni kablo ust uste geldi');
      }
    }
  });

  test('turda olu zaman yok: ilk kivilcim erken gelir', () => {
    // Eski oyunun asil sorunu turun ucte birinin izlemekle gecmesiydi.
    for (let n = 0; n < 100; n++) {
      const inst = wirecut.create(['p0'], Math.random(), {});
      assert.ok(inst.kivilcimlar[0].girer <= 2.0,
        'ilk kivilcim ' + inst.kivilcimlar[0].girer.toFixed(1) + ' sn sonra geliyor');
    }
  });

  test('herkes ayni programi oynar', () => {
    const inst = wirecut.create(['p0', 'p1', 'p2', 'p3'], 0.5, {});
    // Tek bir program var; oyuncuya gore uretilmiyor
    assert.ok(Array.isArray(inst.kivilcimlar));
    assert.ok(inst.kivilcimlar.length > 0);
    const s = inst.snap();
    assert.ok(Array.isArray(s.k), 'kivilcimlar herkese ayni listede gonderiliyor');
  });
});

describe('Kesme kurallari', () => {
  // inst'i, verilen kivilcim bandin ortasina gelene kadar ilerletir
  function bandaGetir(inst, idx) {
    for (let i = 0; i < 3000; i++) {
      const k = inst.aktifler().find((x) => x.i === idx);
      if (k && k.y >= orta(inst)) return k;
      inst.update(DT);
    }
    return null;
  }

  test('bandda kesmek puan verir', () => {
    const inst = wirecut.create(['p0'], 0, {});
    const k = bandaGetir(inst, 0);
    assert.ok(k, 'kivilcim banda gelmedi');
    inst.input('p0', 'grab', { x: inst.wires[k.w].x, y: k.y });
    assert.strictEqual(inst.pl.p0.score, 1);
    assert.strictEqual(inst.pl.p0.bosa, 0);
  });

  test('band disinda kesmek makasi sikistirir', () => {
    const inst = wirecut.create(['p0'], 0, {});
    // Kivilcim daha dogmadan, dogru kabloya dokun
    const w = inst.kivilcimlar[0].w;
    inst.input('p0', 'grab', { x: inst.wires[w].x, y: inst.snap().ky + 5 });
    assert.strictEqual(inst.pl.p0.score, 0, 'erken dokunusa puan verildi');
    assert.ok(inst.pl.p0.pen > 0, 'makas sikismadi');
    assert.strictEqual(inst.pl.p0.bosa, 1);
  });

  test('yanlis kabloya dokunmak makasi sikistirir', () => {
    const inst = wirecut.create(['p0'], 0, {});
    const k = bandaGetir(inst, 0);
    const yanlis = (k.w + 2) % inst.wires.length;
    inst.input('p0', 'grab', { x: inst.wires[yanlis].x, y: k.y });
    assert.strictEqual(inst.pl.p0.score, 0);
    assert.ok(inst.pl.p0.pen > 0);
  });

  test('makas sikisikken kesim islemez', () => {
    const inst = wirecut.create(['p0'], 0, {});
    // ONCE kivilcimi banda getir: bandaGetir zamani ilerletiyor ve ceza
    // eriyor, sirayi ters kurarsak test kendi kendini bozar.
    const k = bandaGetir(inst, 0);
    inst.pl.p0.pen = 1;
    inst.input('p0', 'grab', { x: inst.wires[k.w].x, y: k.y });
    assert.strictEqual(inst.pl.p0.score, 0, 'sikisik makasla kesti');
  });

  test('ayni kivilcim iki kez kesilemez', () => {
    // Yoksa tek bir kivilcimdan puan yagardi
    const inst = wirecut.create(['p0'], 0, {});
    const k = bandaGetir(inst, 0);
    inst.input('p0', 'grab', { x: inst.wires[k.w].x, y: k.y });
    assert.strictEqual(inst.pl.p0.score, 1);
    inst.input('p0', 'grab', { x: inst.wires[k.w].x, y: k.y });
    assert.strictEqual(inst.pl.p0.score, 1, 'ayni kivilcim tekrar kesildi');
    assert.ok(inst.pl.p0.pen > 0, 'ikinci dokunus sikisma yaratmali');
  });

  test('surekli dokunmak ise yaramaz', () => {
    // Oyunun tek stratejik dayanagi bu: mash eden, sikisik makasla
    // siradaki kivilcimi da kacirir.
    const mash = wirecut.create(['p0'], 0, {});
    let kalan = mash.sure;
    while (kalan > 0) {
      for (const w of mash.wires) mash.input('p0', 'grab', { x: w.x, y: mash.snap().ky + 5 });
      mash.update(DT);
      kalan -= DT;
    }
    const kusursuz = kusursuzOyna(0);
    assert.ok(mash.pl.p0.score < kusursuz.pl.p0.score * 0.5,
      'mash eden ' + mash.pl.p0.score + ', kusursuz ' + kusursuz.pl.p0.score);
  });

  test('kacan kivilcim sayiliyor', () => {
    const inst = wirecut.create(['p0'], 0, {});
    let kalan = inst.sure;
    while (kalan > 0) { inst.update(DT); kalan -= DT; }
    assert.strictEqual(inst.pl.p0.score, 0);
    assert.strictEqual(inst.pl.p0.kacti, inst.kivilcimlar.length);
  });
});

describe('Sonuc', () => {
  test('cok kesen kazanir', () => {
    const inst = wirecut.create(['iyi', 'pasif'], 0, {});
    const o = orta(inst);
    let kalan = inst.sure;
    while (kalan > 0) {
      if (inst.pl.iyi.pen <= 0) {
        for (const k of inst.aktifler()) {
          if (inst.pl.iyi.kesilen[k.i]) continue;
          if (Math.abs(k.y - o) > inst.snap().kh / 2 - 2) continue;
          inst.input('iyi', 'grab', { x: inst.wires[k.w].x, y: o });
        }
      }
      inst.update(DT);
      kalan -= DT;
    }
    assert.deepStrictEqual(inst.winners(), ['iyi']);
    assert.deepStrictEqual(inst.derece(), [['iyi'], ['pasif']]);
  });

  test('kimse kesemezse kazanan yok', () => {
    const inst = wirecut.create(['p0', 'p1'], 0, {});
    let kalan = inst.sure;
    while (kalan > 0) { inst.update(DT); kalan -= DT; }
    assert.deepStrictEqual(inst.winners(), []);
    assert.strictEqual(inst.text().k, 'sonuc.wirecut.kimse');
  });

  test('esit kesenler berabere', () => {
    const inst = wirecut.create(['p0', 'p1'], 0, {});
    const o = orta(inst);
    let kalan = inst.sure;
    while (kalan > 0) {
      for (const k of inst.aktifler()) {
        if (Math.abs(k.y - o) > inst.snap().kh / 2 - 2) continue;
        for (const id of ['p0', 'p1']) {
          if (!inst.pl[id].kesilen[k.i] && inst.pl[id].pen <= 0) {
            inst.input(id, 'grab', { x: inst.wires[k.w].x, y: o });
          }
        }
      }
      inst.update(DT);
      kalan -= DT;
    }
    assert.deepStrictEqual(inst.winners(), [], 'esitken kazanan ilan edildi');
    assert.strictEqual(inst.derece().length, 1, 'ikisi de ayni derece grubunda olmali');
  });
});

describe('Istemciye ne gonderiliyor', () => {
  test('gelecek kivilcimlar pakete sizmaz', () => {
    // Paketi okuyan biri siradaki kivilcimin hangi kablodan gelecegini
    // ogrenemesin: snap yalnizca EKRANDA olanlari tasir.
    const inst = wirecut.create(['p0'], 0, {});
    for (let i = 0; i < 200; i++) {
      const s = inst.snap();
      // Olcut PROGRAMIN kendisi: pakete giren her kivilcim gercekten
      // DOGMUS ve henuz bombaya varmamis olmali. (Bunu aktifler() ile
      // karsilastirmak tautolojik olurdu - ikisi ayni kaynaktan geliyor.)
      for (const k of s.k) {
        const prog = inst.kivilcimlar[k.i];
        assert.ok(inst.t >= prog.dogus,
          'daha dogmamis kivilcim pakete kondu (t=' + inst.t.toFixed(2) +
          ', dogus=' + prog.dogus.toFixed(2) + ')');
        assert.ok(k.y <= s.bot + 1, 'bombayi gecmis kivilcim hala pakette');
      }
      const metin = JSON.stringify(s);
      assert.ok(metin.indexOf('kivilcimlar') < 0, 'program listesi sizmis');
      assert.ok(metin.indexOf('dogus') < 0, 'kivilcimlarin dogum ani sizmis');
      inst.update(DT);
    }
  });

  test('kestigim kivilcim pakette isaretli', () => {
    const inst = wirecut.create(['p0', 'p1'], 0, {});
    let k = null;
    for (let i = 0; i < 3000 && !k; i++) {
      const a = inst.aktifler().find((x) => x.y >= orta(inst));
      if (a) k = a; else inst.update(DT);
    }
    inst.input('p0', 'grab', { x: inst.wires[k.w].x, y: k.y });
    const s = inst.snap();
    assert.ok(s.pl.p0.kes.indexOf(k.i) >= 0, 'kesilen kivilcim isaretlenmemis');
    assert.strictEqual(s.pl.p1.kes.indexOf(k.i), -1, 'baskasinin kesimi bana yazilmis');
  });
});

describe('Bot', () => {
  const { sahteConn } = require('./yardimci');
  const { Room } = require('../server/room');

  function botOynat(zorluk, seviye) {
    const oda = new Room('T');
    oda.add(sahteConn(), 'PASIF', 'c0');
    const bot = oda.botEkle();
    oda.botZorluk = zorluk;
    oda.game.mg = wirecut;
    oda.game.inst = wirecut.create(oda.players.map((p) => p.id), seviye, {});
    oda.game.phase = 'play';
    const inst = oda.game.inst;
    let kalan = inst.sure;
    while (kalan > 0) { oda.game.botTick(DT); inst.update(DT); kalan -= DT; }
    return { me: inst.pl[bot.id], toplam: inst.kivilcimlar.length };
  }

  function ortalama(zorluk, deneme) {
    let skor = 0, bosa = 0, toplam = 0;
    for (let i = 0; i < deneme; i++) {
      const r = botOynat(zorluk, 0.5);
      skor += r.me.score; bosa += r.me.bosa; toplam = r.toplam;
    }
    return { skor: skor / deneme, bosa: bosa / deneme, toplam };
  }

  test('zor bot zamanlamayi gozetiyor', () => {
    // Bu oyunda zorluk "ne kadar sik dokunuyor"dan degil ZAMANLAMADAN
    // gelmeli. Zamanlamayi gozetmeyen bir bot bandin disina dokunur ve
    // makasi surekli sikistirir - dusuk sikisma sayisi bu iddiayi tutar.
    const zor = ortalama(2, 40);
    assert.ok(zor.bosa <= 2,
      'zor bot tur basina ' + zor.bosa.toFixed(1) + ' kez makasi sikistiriyor');
    assert.ok(zor.skor >= zor.toplam * 0.8,
      'zor bot ' + zor.skor.toFixed(1) + '/' + zor.toplam + ' kesebiliyor');
  });

  test('zorluk basamaklari ayrisiyor', () => {
    const kolay = ortalama(0, 40), orta = ortalama(1, 40), zor = ortalama(2, 40);
    assert.ok(orta.skor > kolay.skor * 1.5,
      'kolay ' + kolay.skor.toFixed(1) + ' -> orta ' + orta.skor.toFixed(1));
    assert.ok(zor.skor > orta.skor,
      'orta ' + orta.skor.toFixed(1) + ' -> zor ' + zor.skor.toFixed(1));
  });

  test('zor bot kusursuz degil: insan onu gecebilir', () => {
    // Tavan sabit ve beraberlik cozucu yok; kusursuz bot insani en fazla
    // berabere birakirdi.
    const zor = ortalama(2, 60);
    assert.ok(zor.skor < zor.toplam,
      'zor bot her turu kusursuz bitiriyor (' + zor.skor.toFixed(1) + '/' + zor.toplam + ')');
  });
});
