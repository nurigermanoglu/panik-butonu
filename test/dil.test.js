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

describe('Ceviri atlanmamis', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const KOK = path.join(__dirname, '..', 'public');

  // t('...') ile cagrilan HER anahtarin sozlukte karsiligi olmali.
  // Bu testin sebebi somut: zorluk tuslari dizisinde 'KOLAY' ve 'ORTA'
  // anahtara cevrilmis ama ucuncu satirdaki 'ZOR' atlanmisti. t('ZOR')
  // sessizce 'ZOR' donduruyor (bulunamayan anahtar kendisine duser),
  // yani oyun calisiyor ama buton Ingilizcede de Turkce kaliyordu.
  test('istemcide cagrilan butun anahtarlar sozlukte var', () => {
    const dosyalar = [path.join(KOK, 'js', 'main.js')];
    const mgDizin = path.join(KOK, 'js', 'minigames');
    for (const f of fs.readdirSync(mgDizin)) dosyalar.push(path.join(mgDizin, f));

    const bilinmeyen = [];
    for (const yol of dosyalar) {
      // Yorum satirlarini at: aciklamalarda ornek olarak yazilan
      // t('anahtar') cagrilari gercek cagri degil.
      const kaynak = fs.readFileSync(yol, 'utf8')
        .split('\n')
        .map(function (satir) { return satir.replace(/\/\/.*/, ''); })
        .join('\n');
      const re = /\bt\(\s*'([^']+)'/g;
      let m;
      while ((m = re.exec(kaynak))) {
        const a = m[1];
        // Degisken ile kurulan anahtarlar ('yon.' + e.y gibi) elenir
        if (a.slice(-1) === '.') continue;
        D.sec('tr');
        if (D.t(a) === a) bilinmeyen.push(path.basename(yol) + ': t(\'' + a + '\')');
      }
      // ZORLUK gibi dizilerde anahtar dogrudan yaziliyor: onlari da tara
      const re2 = /\bad:\s*'([^']+)'/g;
      while ((m = re2.exec(kaynak))) {
        const a = m[1];
        if (a.indexOf('.') < 0) continue;         // anahtar bicimi degilse gec
        if (D.t(a) === a) bilinmeyen.push(path.basename(yol) + ': ad: \'' + a + '\'');
      }
    }
    D.sec('tr');
    assert.strictEqual(bilinmeyen.length, 0,
      'sozlukte olmayan anahtarlar:\n  ' + bilinmeyen.join('\n  '));
  });

  // index.html'deki gorunur her yazi ya data-dil ile isaretli olmali ya da
  // bilerek cevrilmeyenler listesinde. Kullanici menude uc Turkce satir
  // buldu (slogan, hizli oyna ipucu, kontrol aciklamasi) - bu test onlari
  // yakalar.
  test('index.html\'de isaretsiz Turkce metin kalmamis', () => {
    const h = fs.readFileSync(path.join(KOK, 'index.html'), 'utf8');
    // Cevrilmesi GEREKMEYENLER: oyunun adi (marka), oklar, simgeler
    const MUAF = ['PARTİ PANİK', 'PARTİ', 'PANİK', 'TR'];
    const bulunan = [];
    const re = />([^<>]{2,})</g;
    let m;
    while ((m = re.exec(h))) {
      const yazi = m[1].replace(/&[a-z]+;|&#\d+;/g, '').replace(/\s+/g, ' ').trim();
      if (!yazi) continue;
      if (MUAF.indexOf(yazi) >= 0) continue;
      // Turkce'ye ozgu harf ya da bilinen Turkce kelime iceriyor mu?
      if (!/[çğıöşüÇĞİÖŞÜ]/.test(yazi) && !/\b(bas|hareket|kullan|kişilik|eşleş)\b/i.test(yazi)) continue;
      // Bu metnin etiketinde data-dil var mi?
      const oncesi = h.slice(Math.max(0, m.index - 300), m.index);
      const etiket = oncesi.slice(oncesi.lastIndexOf('<'));
      if (etiket.indexOf('data-dil') >= 0) continue;
      bulunan.push(yazi.slice(0, 50));
    }
    assert.strictEqual(bulunan.length, 0,
      'data-dil ile isaretlenmemis Turkce metin:\n  ' + bulunan.join('\n  '));
  });

  test('placeholder ve aria-label"lar isaretli', () => {
    const h = fs.readFileSync(path.join(KOK, 'index.html'), 'utf8');
    const bulunan = [];
    const re = /<[^>]*\b(placeholder|aria-label)="([^"]+)"[^>]*>/g;
    let m;
    while ((m = re.exec(h))) {
      const etiket = m[0];
      const deger = m[2];
      if (etiket.indexOf('data-dil-ph') >= 0 || etiket.indexOf('data-dil-al') >= 0) continue;
      if (!/[çğıöşüÇĞİÖŞÜ]/.test(deger) && !/\b(Sesi|Mesaj|Sohbet|ADIN|KOD)\b/.test(deger)) continue;
      bulunan.push(deger);
    }
    assert.strictEqual(bulunan.length, 0,
      'isaretlenmemis placeholder/aria-label:\n  ' + bulunan.join('\n  '));
  });
});

describe('Cizim kodu calisiyor', () => {
  const fs = require('node:fs');
  const path = require('node:path');

  // NEDEN: dil destegi eklenirken her cizim dosyasina "var t = ..." kisayolu
  // konuldu. Uc dosyada bu kisayol yerel bir dongu degiskeniyle (for var t)
  // GOLGELENDI ve cizim ortasinda "t is not a function" atti. Sonuc: At
  // Yarisi'nda ilk kulvardan sonrasi hic cizilmedi, Kablo Kesme'de ekran
  // yarim kaldi. Testler yesildi cunku hicbiri CIZIM kodunu calistirmiyordu.
  //
  // Bu test cizimi gercekten calistirir. Tuvali sahte bir 2D baglamla
  // taklit ediyoruz: amac goruntuyu dogrulamak degil, kodun patlamadigini
  // gormek.
  function sahteBaglam() {
    const hicbirSey = function () { return sahteBaglam.donen; };
    const ctx = {
      canvas: { width: 320, height: 180 },
      globalAlpha: 1, fillStyle: '', font: '', textAlign: '', textBaseline: '',
      imageSmoothingEnabled: false
    };
    for (const ad of ['save', 'restore', 'fillRect', 'clearRect', 'drawImage',
      'beginPath', 'rect', 'clip', 'setTransform', 'translate', 'fill',
      'createPattern', 'fillText', 'moveTo', 'lineTo', 'stroke', 'closePath',
      'arc', 'scale']) ctx[ad] = hicbirSey;
    ctx.measureText = function (s) {
      return { width: String(s).length * 6, actualBoundingBoxAscent: 7 };
    };
    return ctx;
  }

  // Tarayici dosyalarini tek bir vm baglaminda yukle
  function istemciYukle() {
    const vm = require('node:vm');
    const KOK = path.join(__dirname, '..', 'public', 'js');
    const belge = {
      documentElement: { setAttribute() {} },
      querySelectorAll() { return []; },
      createElement() {
        return { width: 0, height: 0, getContext: () => sahteBaglam(), style: {} };
      }
    };
    const kutu = {
      window: {},
      navigator: { language: 'tr' },
      localStorage: { getItem() { return null; }, setItem() {} },
      document: belge,
      Image: function () { this.onload = null; this.onerror = null; },
      performance: { now: () => 0 },
      Math: Math, JSON: JSON, Date: Date, isFinite: isFinite, String: String,
      Number: Number, Array: Array, Object: Object
    };
    vm.createContext(kutu);
    for (const dosya of ['dil.js', 'font.js', 'gfx.js', 'chars.js']) {
      vm.runInContext(fs.readFileSync(path.join(KOK, dosya), 'utf8'), kutu, { filename: dosya });
    }
    const mgDizin = path.join(KOK, 'minigames');
    for (const dosya of fs.readdirSync(mgDizin)) {
      vm.runInContext(fs.readFileSync(path.join(mgDizin, dosya), 'utf8'), kutu, { filename: dosya });
    }
    return kutu.window.PP;
  }

  const PPI = istemciYukle();
  const DT = 1 / 30;

  // Oyunu bastan sona oynatip yol boyunca birkac anin snap'ini toplar.
  // Bitis ani ozellikle onemli: bildirilen iki hata da orada goruluyordu.
  function anlar(mg, kisi) {
    const ids = ['a', 'b', 'c', 'd'].slice(0, kisi);
    const inst = mg.create(ids.slice(), 0.5, {});
    if (inst.start) inst.start();
    const out = [];
    const sure = inst.sure || mg.duration;
    for (let t = 0, n = 0; t < sure; t += DT, n++) {
      for (const id of ids) {
        try {
          if (mg.controls === 'dpad' || mg.controls === 'lr') {
            inst.input(id, 'dir', ['left', 'right', 'up', 'down'][n % 4]);
          } else if (mg.controls === 'action') {
            inst.input(id, 'press', 200, 0);
          } else if (mg.controls === 'pointer') {
            inst.input(id, 'grab', { x: 40 + (n * 37) % 240, y: 50 + (n * 29) % 110 });
            inst.input(id, 'drop', { x: 40 + (n * 53) % 240, y: 50 + (n * 41) % 110 });
          }
        } catch (e) { /* yoksay */ }
      }
      inst.update(DT);
      if (n % 40 === 0) out.push(inst.snap());
      if (inst.done && inst.done()) break;
    }
    out.push(inst.snap());          // BITIS ani
    return out;
  }

  const MG = require('../server/minigames');
  for (const mg of MG) {
    test(mg.id + ' - cizim hicbir anda patlamiyor', () => {
      const ctx = sahteBaglam();
      for (const kisi of [2, 4]) {
        for (const st of anlar(mg, kisi)) {
          const oyuncular = ['a', 'b', 'c', 'd'].slice(0, kisi).map((id, i) => ({
            id: id, name: ['SEN', 'ROBOT', 'AYSE', 'MEHMET'][i], slot: i, char: i
          }));
          const v = {
            W: 320, H: 180, top: 22, time: 5.1, players: oyuncular,
            you: 'a', gecikme: 0, ptr: { x: 150, y: 110, down: false }
          };
          for (const dil of ['tr', 'en']) {
            PPI.dil.sec(dil);
            assert.doesNotThrow(
              () => PPI.MG[mg.id].draw(ctx, st, v),
              mg.id + ' (' + kisi + ' kisi, ' + dil + ') cizimi patladi'
            );
          }
        }
      }
      PPI.dil.sec('tr');
    });
  }
});

describe('Cizimde sabit metin kalmamis', () => {
  const fs = require('node:fs');
  const path = require('node:path');

  // NEDEN: lobide bos oyuncu yuvasinin etiketi f.text(ctx, 'BOS', ...)
  // seklinde dogrudan yazilmisti; Ingilizce oynarken de "BOS" gorunuyordu.
  // Anahtar tarayan test bunu yakalayamadi cunku ortada t() cagrisi yoktu.
  // Bu test cizim cagrilarinin ILK argumanina bakar.
  //
  // Dilden bagimsiz metinler (rakam, saat, isaret) muaf.
  const MUAF = /^[\s0-9:.,+\-%×✓✗!?#*<>()[\]{}/\|]*$/;

  const dosyalar = [path.join(__dirname, '..', 'public', 'js', 'main.js')];
  const mgDizin = path.join(__dirname, '..', 'public', 'js', 'minigames');
  for (const d of fs.readdirSync(mgDizin)) dosyalar.push(path.join(mgDizin, d));

  for (const yol of dosyalar) {
    test(path.basename(yol) + ' - f.text sabit metin almiyor', () => {
      const satirlar = fs.readFileSync(yol, 'utf8').split(/\r?\n/);
      const kotu = [];
      for (let i = 0; i < satirlar.length; i++) {
        const m = satirlar[i].replace(/\/\/.*/, '').match(/f\.text\(ctx,\s*'([^']*)'/);
        if (m && !MUAF.test(m[1])) kotu.push('satir ' + (i + 1) + ': ' + m[1]);
      }
      assert.deepStrictEqual(kotu, [],
        path.basename(yol) + ' icinde cevrilmemis sabit metin: ' + kotu.join(', '));
    });
  }
});
