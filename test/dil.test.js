'use strict';
// DIL DESTEGI (Turkce / Ingilizce)
//
// TASARIM: sunucu bitmis METIN degil ANAHTAR gonderir; ceviriyi istemci
// yapar. Boylece ayni odadaki iki kisi farkli dilde oynayabilir. Bu testin
// isi o sozlesmeyi tutmak:
//
//   1. Iki sozlukte de AYNI anahtarlar var mi? (yarim ceviri olmasin)
//   2. Sunucunun text() ile dondurdugu her anahtarin karsiligi var mi?
//   3. Her mini oyunun adi ve emri iki dilde de tanimli mi?
//   4. Yer tutucular ({n} gibi) iki dilde de ayni mi?
//
// 3. madde ozellikle onemli: yeni bir mini oyun eklenip cevirisi
// unutulursa ekranda anahtarin kendisi ("oyun.yenioyun.ad") gorunurdu.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const MINIGAMES = require('../server/minigames');

// dil.js bir TARAYICI dosyasi. Node'un kendi global'lerine dokunmadan
// (Node 24'te navigator salt okunur) ayri bir vm baglaminda calistiriyoruz;
// window/localStorage/document taklitleri orada yasiyor.
function dilYukle() {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const kaynak = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'dil.js'), 'utf8');
  const kutu = {
    window: {},
    navigator: { language: 'tr' },
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {
      documentElement: { setAttribute() {} },
      querySelectorAll() { return []; }
    }
  };
  vm.createContext(kutu);
  vm.runInContext(kaynak, kutu, { filename: 'dil.js' });
  return kutu.window.PP.dil;
}

const D = dilYukle();

describe('Sozluk butunlugu', () => {
  test('iki dilde de ayni anahtarlar var', () => {
    // NOT: eksikler() dizisi vm baglaminda uretiliyor, yani Array prototipi
    // buradakinden farkli. deepStrictEqual bu yuzden bos dizide bile patlar;
    // uzunluga bakmak hem dogru hem de hata mesajini okunakli birakiyor.
    const eks = D.eksikler();
    assert.strictEqual(eks.length, 0, 'yarim ceviri:\n  ' + eks.join('\n  '));
  });

  test('hicbir ceviri bos degil', () => {
    for (const kod of D.diller) {
      D.sec(kod);
      // Bilinen bir anahtar uzerinden sozlugu dolas
      for (const mg of MINIGAMES) {
        for (const son of ['.ad', '.emir']) {
          const a = 'oyun.' + mg.id + son;
          const c = D.t(a);
          assert.notStrictEqual(c, a, kod + ': ' + a + ' cevrilmemis');
          assert.ok(c.trim().length > 0, kod + ': ' + a + ' bos');
        }
      }
    }
    D.sec('tr');
  });
});

describe('Mini oyunlarin cevirisi', () => {
  test('her oyunun adi ve emri iki dilde tanimli', () => {
    for (const kod of D.diller) {
      D.sec(kod);
      for (const mg of MINIGAMES) {
        const ad = D.t('oyun.' + mg.id + '.ad');
        const emir = D.t('oyun.' + mg.id + '.emir');
        assert.notStrictEqual(ad, 'oyun.' + mg.id + '.ad',
          kod + ': ' + mg.id + ' oyununun ADI cevrilmemis');
        assert.notStrictEqual(emir, 'oyun.' + mg.id + '.emir',
          kod + ': ' + mg.id + ' oyununun EMRI cevrilmemis');
      }
    }
    D.sec('tr');
  });
});

describe('Sunucunun dondurdugu anahtarlar', () => {
  // text() farkli durumlarda farkli anahtar donuyor; oyunu bir kere bastan
  // sona oynatip yol boyunca cikan butun anahtarlari topluyoruz.
  function anahtarlariTopla(mg) {
    const bulunan = new Set();
    const DT = 1 / 30;
    for (let deneme = 0; deneme < 12; deneme++) {
      const inst = mg.create(['p0', 'p1'], deneme / 12, {});
      if (inst.start) inst.start();
      const sure = inst.sure || mg.duration;
      for (let t = 0; t < sure; t += DT) {
        // Rastgele girdi: farkli sonuc dallarina dusmek icin
        for (const id of ['p0', 'p1']) {
          try {
            if (mg.controls === 'dpad' || mg.controls === 'lr') {
              inst.input(id, 'dir', ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)]);
            } else if (mg.controls === 'action') {
              inst.input(id, 'press', 200, 0);
            } else if (mg.controls === 'pointer') {
              inst.input(id, 'grab', { x: 20 + Math.random() * 280, y: 40 + Math.random() * 120 });
              inst.input(id, 'drop', { x: 20 + Math.random() * 280, y: 40 + Math.random() * 120 });
            }
          } catch (e) { /* yoksay */ }
        }
        inst.update(DT);
        const y = inst.text();
        if (y && y.k) bulunan.add(y.k);
        if (inst.done && inst.done()) break;
      }
      const son = inst.text();
      if (son && son.k) bulunan.add(son.k);
    }
    return [...bulunan];
  }

  for (const mg of MINIGAMES) {
    test(mg.id + ' - dondurdugu anahtarlar iki dilde de var', () => {
      const anahtarlar = anahtarlariTopla(mg);
      assert.ok(anahtarlar.length > 0, mg.id + ': hic anahtar toplanamadi');
      for (const kod of D.diller) {
        D.sec(kod);
        for (const a of anahtarlar) {
          assert.notStrictEqual(D.t(a), a,
            kod + ': ' + mg.id + ' "' + a + '" anahtarinin karsiligi yok');
        }
      }
      D.sec('tr');
    });
  }

  test('text() her zaman anahtar nesnesi donuyor', () => {
    for (const mg of MINIGAMES) {
      const inst = mg.create(['p0', 'p1'], 0, {});
      if (inst.start) inst.start();
      const y = inst.text();
      assert.strictEqual(typeof y, 'object', mg.id + ': text() metin donduruyor');
      assert.strictEqual(typeof y.k, 'string', mg.id + ': text().k eksik');
    }
  });
});

describe('Yer tutucular', () => {
  test('iki dilde de ayni yer tutucular kullaniliyor', () => {
    // '{n} TUR' ile '{n} ROUNDS' uyumlu; ama '{n} TUR' ile 'ROUNDS'
    // uyumsuz olurdu - sayi ekranda hic gorunmezdi.
    const tutucu = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');
    // Sozluge disaridan erisemedigimiz icin bilinen sablonlu anahtarlari
    // tek tek deniyoruz.
    const SABLONLU = [
      'lobi.enAzKisi', 'lobi.hedef', 'lobi.bot', 'lobi.kod',
      'mac.tur', 'mac.hiz', 'mac.kazandi', 'mac.durduSn', 'ag.yok', 'ag.kisiKoptu',
      'istat.tur', 'istat.seri', 'istat.uzmanlikDeger',
      'sonuc.race.sure', 'sonuc.reflex.ms', 'sonuc.mole.skor',
      'sonuc.filedelete.kismi', 'sonuc.wirecut.skor', 'sonuc.wirecut.skorSikisma',
      'sonuc.shapesort.kismi', 'sonuc.puzzle.kismi',
      'sonuc.collect.skor', 'sonuc.collect.skorBomba',
      'sonuc.tersemir.skor', 'sonuc.tersemir.skorYanlis', 'ic.reflex.ms'
    ];
    for (const a of SABLONLU) {
      D.sec('tr');
      const trHam = D.t(a, {});      // deger vermeyince yer tutucular kalir
      D.sec('en');
      const enHam = D.t(a, {});
      assert.strictEqual(tutucu(trHam), tutucu(enHam),
        a + ': yer tutucular uyusmuyor (tr "' + trHam + '" / en "' + enHam + '")');
    }
    D.sec('tr');
  });
});
