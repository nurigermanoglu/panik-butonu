'use strict';
// ZEMIN COKUYOR
//
// En kritik iddia: desen hicbir zaman oyuncuyu kusatmaz. Bunu "kusursuz
// oyuncu" simulasyonuyla olcuyoruz - tehlike aninda en gec cokecek komsuya
// kacan bir bot, uretilen hicbir desende olmemeli.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT } = require('./yardimci');
const floor = require('../server/minigames/floor');

function komsular(h, n) {
  const x = h % n, y = Math.floor(h / n);
  const out = [];
  if (x > 0) out.push(h - 1);
  if (x < n - 1) out.push(h + 1);
  if (y > 0) out.push(h - n);
  if (y < n - 1) out.push(h + n);
  return out;
}

// h karesinin SU ANDAN SONRAKI ilk cokme ani (Infinity = bir daha cokmez).
// Kalici cokme modelinde her kare en fazla bir kez coker. Yine de en
// yakin cokme anini almak dogru davranis.
function sonrakiCokme(inst, h) {
  let en = Infinity;
  for (const p of inst.plan) {
    const c = p.t + p.uyari;
    if (p.h === h && c > inst.t) en = Math.min(en, c);
  }
  return en;
}

// KUSURSUZ oyuncu: tehlikedeyken komsulari arasindan en gec cokecek olana
// kacar. Bot plana bakabiliyor - amac desen garantisini olcmek, bot zekasini
// degil. Desen "her zaman kacilabilir" ise bu bot asla olmemeli.
function kusursuzOyna(seviye) {
  const inst = floor.create(['p0'], seviye);
  const n = inst.n;
  let kalan = inst.sure;
  while (kalan > 0) {
    const me = inst.pl.p0;
    if (!me.alive) return false;

    if (inst.hucreDurum(me.h) === 1) {
      const kom = komsular(me.h, n).filter((k) => inst.hucreDurum(k) !== 2);
      kom.sort((a, b) => sonrakiCokme(inst, b) - sonrakiCokme(inst, a));
      if (kom[0] !== undefined) {
        const fark = kom[0] - me.h;
        inst.input('p0', 'dir',
          fark === 1 ? 'right' : fark === -1 ? 'left' : fark === n ? 'down' : 'up');
      }
    }
    inst.update(DT);
    kalan -= DT;
  }
  return inst.pl.p0.alive;
}

describe('Desen adaleti', () => {
  test('kusursuz oyuncu her seviyede hayatta kaliyor', () => {
    for (const seviye of [0, 0.5, 1]) {
      let olen = 0;
      for (let i = 0; i < 200; i++) if (!kusursuzOyna(seviye)) olen++;
      assert.strictEqual(olen, 0,
        'seviye ' + seviye + ': 200 desenin ' + olen + ' tanesinde kacis yoktu');
    }
  });

  test('hicbir anda izgara kritik esigin altina inmiyor', () => {
    // Izgara tamamen tukenmemeli: uzerinde durulabilecek birkac kare
    // her zaman kalmali.
    for (const seviye of [0, 1]) {
      for (let i = 0; i < 40; i++) {
        const inst = floor.create(['p0'], seviye);
        let kalan = inst.sure;
        while (kalan > 0) {
          let saglam = 0;
          for (let h = 0; h < inst.n * inst.n; h++) {
            if (inst.hucreDurum(h) !== 2) saglam++;
          }
          assert.ok(saglam >= 4, 'ayni anda sadece ' + saglam + ' kare ayaktaydi');
          inst.update(DT);
          kalan -= DT;
        }
      }
    }
  });

  test('her saglam karenin her an bir saglam komsusu var', () => {
    // Kusatilma testi: hicbir kare tek basina kalmamali.
    for (const seviye of [0, 1]) {
      for (let i = 0; i < 30; i++) {
        const inst = floor.create(['p0'], seviye);
        let kalan = inst.sure;
        while (kalan > 0) {
          for (let h = 0; h < inst.n * inst.n; h++) {
            if (inst.hucreDurum(h) === 2) continue;
            const kacis = komsular(h, inst.n).some((k) => inst.hucreDurum(k) !== 2);
            assert.ok(kacis, 'kare ' + h + ' kusatilmis durumda');
          }
          inst.update(DT);
          kalan -= DT;
        }
      }
    }
  });

  test('ayni kare ayni dalgada iki kez planlanmiyor', () => {
    // Kalici cokme modelinde bir kare yalnizca bir kez planlanabilir;
    // tekrar planlanmasi hata olurdu.
    for (let i = 0; i < 40; i++) {
      const inst = floor.create(['p0'], 0.5);
      const gorulen = new Set();
      for (const p of inst.plan) {
        const anahtar = p.h + '@' + p.t.toFixed(3);
        assert.ok(!gorulen.has(anahtar), 'ayni dalgada tekrar: ' + anahtar);
        gorulen.add(anahtar);
      }
    }
  });

  test('oyun gercekten tehlikeli: hic kacmayan duser', () => {
    let hayatta = 0;
    for (let i = 0; i < 200; i++) {
      const inst = floor.create(['p0'], 0);
      let kalan = inst.sure;
      while (kalan > 0) { inst.update(DT); kalan -= DT; }
      if (inst.pl.p0.alive) hayatta++;
    }
    assert.ok(hayatta <= 20,
      'hic oynamayan 200 macin ' + hayatta + ' tanesinde kurtuldu (esik 20)');
  });
});

describe('Hareket kurallari', () => {
  test('izgara disina cikilmaz', () => {
    const inst = floor.create(['p0'], 0);
    inst.pl.p0.h = 0;                             // sol ust kose
    inst.input('p0', 'dir', 'left');
    assert.strictEqual(inst.pl.p0.h, 0);
    inst.input('p0', 'dir', 'up');
    assert.strictEqual(inst.pl.p0.h, 0);
    inst.input('p0', 'dir', 'right');
    assert.strictEqual(inst.pl.p0.h, 1);
    inst.input('p0', 'dir', 'down');
    assert.strictEqual(inst.pl.p0.h, 1 + inst.n);
  });

  test('cokmus kareye adim atan bosluga duser', () => {
    // Bosluklar gorunmez duvar degil: yanlis yone basarsan dusersin.
    const inst = floor.create(['p0'], 0);
    const hedef = inst.plan[0].h;
    while (inst.hucreDurum(hedef) !== 2) inst.update(DT);
    const kom = komsular(hedef, inst.n).filter((k) => inst.hucreDurum(k) !== 2)[0];
    // Kurulum: izgarayi ilerletirken oyuncunun kendi karesi cokmus olabilir.
    // Test edilen sey bosluga ADIM ATMAK oldugu icin durumu sifirliyoruz.
    inst.pl.p0.h = kom;
    inst.pl.p0.alive = true;
    inst.pl.p0.deadAt = inst.sure;
    const fark = hedef - kom;
    inst.input('p0', 'dir',
      fark === 1 ? 'right' : fark === -1 ? 'left' : fark === inst.n ? 'down' : 'up');
    assert.strictEqual(inst.pl.p0.h, hedef, 'bosluga girilemedi');
    assert.strictEqual(inst.pl.p0.alive, false, 'bosluga girdi ama dusmedi');
    assert.ok(inst.pl.p0.deadAt <= inst.t, 'dusme ani kaydedilmedi');
  });

  test('dusen oyuncu bir daha dusmez', () => {
    const inst = floor.create(['p0'], 0);
    inst.pl.p0.alive = false;
    inst.pl.p0.deadAt = 3;
    inst.input('p0', 'dir', 'right');
    assert.strictEqual(inst.pl.p0.deadAt, 3, 'dusme ani ustune yazildi');
  });

  test('dusen oyuncu artik hareket edemez', () => {
    const inst = floor.create(['p0'], 0);
    inst.pl.p0.alive = false;
    const yer = inst.pl.p0.h;
    inst.input('p0', 'dir', 'right');
    assert.strictEqual(inst.pl.p0.h, yer);
  });

  test('bilinmeyen girdi yok sayilir', () => {
    const inst = floor.create(['p0'], 0);
    const yer = inst.pl.p0.h;
    inst.input('p0', 'dir', 'yukari');
    inst.input('p0', 'press', 1);
    inst.input('p0', 'grab', { x: 10, y: 10 });
    assert.strictEqual(inst.pl.p0.h, yer);
  });
});

describe('Sonuc', () => {
  test('ayakta kalan, dusenleri yener', () => {
    const inst = floor.create(['p0', 'p1'], 0);
    inst.pl.p1.alive = false;
    inst.pl.p1.deadAt = 5;
    assert.deepStrictEqual(inst.winners(), ['p0']);
    assert.deepStrictEqual(inst.derece(), [['p0'], ['p1']]);
    assert.strictEqual(inst.text(), 'AYAKTA KALAN!');
  });

  test('herkes duserse en gec dusen kazanir', () => {
    const inst = floor.create(['p0', 'p1'], 0);
    inst.pl.p0.alive = false; inst.pl.p0.deadAt = 3;
    inst.pl.p1.alive = false; inst.pl.p1.deadAt = 9;
    assert.deepStrictEqual(inst.winners(), ['p1']);
    assert.deepStrictEqual(inst.derece(), [['p1'], ['p0']]);
    assert.strictEqual(inst.text(), 'EN GEC DUSEN!');
    assert.ok(inst.done(), 'herkes dustuyse tur bitmeli');
  });

  test('hepsi ayakta kalirsa berabere', () => {
    const inst = floor.create(['p0', 'p1'], 0);
    assert.deepStrictEqual(inst.winners(), []);
    assert.strictEqual(inst.text(), 'HEPSI AYAKTA KALDI!');
  });
});

describe('Ortak izgara', () => {
  test('oyuncular farkli karelerden baslar', () => {
    for (const kisi of [2, 3, 4]) {
      const ids = [];
      for (let i = 0; i < kisi; i++) ids.push('p' + i);
      const inst = floor.create(ids, 0);
      const yerler = ids.map((id) => inst.pl[id].h);
      assert.strictEqual(new Set(yerler).size, kisi,
        kisi + ' kisi ayni kareden basladi: ' + yerler.join(','));
    }
  });

  test('herkes ayni izgarada: tek hucre listesi yayinlaniyor', () => {
    const inst = floor.create(['p0', 'p1', 'p2', 'p3'], 0);
    const s = inst.snap();
    assert.strictEqual(s.hucre.length, inst.n * inst.n,
      'oyuncu basina ayri izgara gonderilmemeli');
  });

  test('ayni kareye birden fazla oyuncu girebilir', () => {
    // Engelleme olsaydi rakip senin tek kacis karene oturup seni caresiz
    // birakabilirdi - bu da adalet garantisini bozardi.
    const inst = floor.create(['p0', 'p1'], 0);
    // Izgara boyutundan bagimsiz: ikinci satirin ikinci karesi ve solundaki
    const hedef = inst.n + 1;
    inst.pl.p0.h = hedef;
    inst.pl.p1.h = hedef - 1;
    inst.input('p1', 'dir', 'right');
    assert.strictEqual(inst.pl.p1.h, hedef, 'dolu kareye girilemedi');
    assert.strictEqual(inst.pl.p0.h, hedef, 'oradaki oyuncu itilmemeli');
  });

  test('hic kacmayan HER oyuncu duser', () => {
    // Baslangic karelerinin hepsi turun bir noktasinda cokmeli.
    let kurtulan = 0, toplam = 0;
    for (let i = 0; i < 120; i++) {
      const inst = floor.create(['p0', 'p1', 'p2', 'p3'], 0);
      let kalan = inst.sure;
      while (kalan > 0) { inst.update(DT); kalan -= DT; }
      for (const id of inst.ids) { toplam++; if (inst.pl[id].alive) kurtulan++; }
    }
    const oran = kurtulan / toplam;
    assert.ok(oran <= 0.12,
      'hic oynamayanlarin %' + Math.round(oran * 100) + "'i kurtuldu (esik %12)");
  });
});
