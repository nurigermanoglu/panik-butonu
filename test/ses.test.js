'use strict';
// SES OLAYLARININ SNAP ILE SOZLESMESI
//
// public/js/main.js icindeki sesOlaylari() her mini oyun icin snap'teki
// BELLI alanlara bakar ve degisimlerinden ses tetikler. Bu sozlesme hicbir
// yerde zorlanmiyordu ve bir kez kirildi: Kablo Kesme zamanlama oyununa
// cevrilince snap'teki ilerleme alani 'p' yerine 's' oldu, ama ses kodu
// 'p' okumaya devam etti - kesme sesi sessizce kayboldu. Testler yesildi,
// oyun oynanabilirdi, sadece ses yoktu.
//
// Burada iki sey sinaniyor:
//   1. Ses kodunun okudugu her alan gercekten snap'te var mi?
//   2. main.js her mini oyun icin bir ses dali tasiyor mu? (yeni oyun
//      eklendiginde sessiz kalmasin)
//
// NOT: bu test sesin KALITESINI degil, BAGLANTISINI dogrular. Sesin dogru
// anda calmasi zaten olay tabanli ve elle dinlenerek ayarlaniyor.
//
// SINIRI: ses adlari metin olarak araniyor. Bir oyunun BASKA oyunlarla
// PAYLASTIGI bir ses (ornegin 'patla' hem Kostebek hem Yakala'da) tek bir
// oyundan kaldirilirsa burada yakalanmaz - ad blokta yine geciyor olur.
// Yakalanan sey daha onemlisi: bir oyunun tumden sessizlesmesi, snap alan
// adinin degismesi ve yalnizca tek oyunun kullandigi bir sesin dusmesi.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const MINIGAMES = require('../server/minigames');

// sesOlaylari()'nin her oyunda okudugu alanlar.
// ust  = snap()'in kokundeki alanlar
// pl   = snap().pl[oyuncuId] icindeki alanlar
const SOZLESME = {
  race: { ust: ['p'], pl: [], sfx: ['nal'] },
  reflex: { ust: ['sig'], pl: [], sfx: ['go'] },
  dodge: { ust: [], pl: ['a'], sfx: ['carp'] },
  memory: { ust: ['prog', 'out'], pl: [], sfx: ['dogru', 'hata'] },
  mole: { ust: [], pl: ['s', 'fl'], sfx: ['vur', 'patla'] },
  hotpotato: { ust: ['holder', 'fuse'], pl: [], sfx: ['pas', 'fitil'] },
  filedelete: { ust: [], pl: ['s', 'fl'], sfx: ['sil'] },
  wirecut: { ust: [], pl: ['s', 'fl', 'pen'], sfx: ['kes', 'hata'] },
  shapesort: { ust: [], pl: ['s', 'fl'], sfx: ['otur', 'hata'] },
  puzzle: { ust: [], pl: ['s', 'fl'], sfx: ['otur', 'hata'] },
  floor: { ust: [], pl: ['a'], sfx: ['carp'] },
  collect: { ust: [], pl: ['s', 'fl'], sfx: ['dogru', 'patla'] },
  tersemir: { ust: [], pl: ['s', 'fl'], sfx: ['dogru', 'hata'] },
};

// Oyunu, snap'i anlamli hale gelene kadar biraz ilerletir (bazi oyunlar
// ilk karede bos liste doner ama alanlar yine de bulunmali).
function ornekSnap(mg) {
  const inst = mg.create(['p0', 'p1'], 0, {});
  if (inst.start) inst.start();
  return inst.snap();
}

describe('Ses olaylari snap ile uyumlu', () => {
  for (const mg of MINIGAMES) {
    test(mg.id + ' - ses kodunun okudugu alanlar snap"te var', () => {
      const s = SOZLESME[mg.id];
      assert.ok(s, mg.id + ': bu oyun icin ses sozlesmesi tanimlanmamis');
      const snap = ornekSnap(mg);

      for (const alan of s.ust) {
        assert.ok(alan in snap,
          mg.id + ': ses kodu snap.' + alan + ' okuyor ama snap"te yok');
      }
      if (s.pl.length) {
        assert.ok(snap.pl && snap.pl.p0,
          mg.id + ': ses kodu snap.pl bekliyor ama yok');
        for (const alan of s.pl) {
          assert.ok(alan in snap.pl.p0,
            mg.id + ': ses kodu snap.pl[..].' + alan + ' okuyor ama snap"te yok');
        }
      }
    });
  }
});

describe('Hicbir oyun sessiz kalmiyor', () => {
  const main = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'main.js'), 'utf8');
  const blok = main.slice(main.indexOf('function sesOlaylari'),
    main.indexOf('function muzikAyarla'));

  test('sesOlaylari blogu bulunabiliyor', () => {
    assert.ok(blok.length > 200, 'sesOlaylari() bulunamadi - test kor kaldi');
  });

  for (const mg of MINIGAMES) {
    test(mg.id + ' - ses dali var', () => {
      assert.ok(blok.indexOf("'" + mg.id + "'") >= 0,
        mg.id + ": main.js'deki sesOlaylari() bu oyun icin hicbir ses tetiklemiyor");
    });
  }

  for (const mg of MINIGAMES) {
    test(mg.id + ' - bekledigi sesler tetikleniyor', () => {
      // Sadece oyun id'sinin blokta gecmesi yetmiyor: Kablo Kesme'nin
      // kesme sesi kaldirildiginda id yine baska bir dalda (makas sikismasi)
      // gectigi icin fark edilmemisti. Ses ADLARI da aranir.
      for (const ad of SOZLESME[mg.id].sfx) {
        assert.ok(blok.indexOf('PP.sfx.' + ad) >= 0,
          mg.id + ': PP.sfx.' + ad + ' artik sesOlaylari() icinde cagrilmiyor');
      }
    });
  }

  test('kullanilan butun ses adlari gercekten var', () => {
    // Yazim hatasi sessizce calismaz bir ses birakir
    const sound = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'js', 'sound.js'), 'utf8');
    for (const id of Object.keys(SOZLESME)) {
      for (const ad of SOZLESME[id].sfx) {
        assert.ok(sound.indexOf(ad) >= 0,
          'sound.js icinde ' + ad + ' diye bir ses yok (' + id + ' onu cagiriyor)');
      }
    }
  });

  test('sozlesme listesi mini oyun listesiyle ayni', () => {
    // Oyun eklenip sozlesme unutulursa ya da oyun silinip sozlesme
    // kalirsa burada yakalanir.
    assert.deepStrictEqual(
      Object.keys(SOZLESME).sort(),
      MINIGAMES.map((m) => m.id).sort());
  });
});
