'use strict';
// Mac akisi: lobi -> intro -> play -> result -> gameover ve sampiyon ekrani.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, odaKur, sampiyonEkranina } = require('./yardimci');
const wc = require('../server/minigames/wirecut');

/**
 * Bir maci sonuna kadar oynatir.
 * Botlar BIREBIR ayni oynarsa turlarin cogu berabere biter ve hedefe kimse
 * ulasamaz; her oyuncuya farkli tempo/konum vererek turlarin kazananli
 * bitmesini sagliyoruz.
 */
function macOynat(kisi, hedef) {
  const { oda, oyuncular } = odaKur(kisi, { hedef });
  for (const p of oyuncular) oda.game.setReady(p, true);
  assert.notStrictEqual(oda.game.phase, 'lobby', 'herkes hazir olunca mac baslamali');

  let tik = 0;
  while (oda.game.phase !== 'gameover' && tik < 30 * 60 * 10) {
    if (oda.game.phase === 'play') {
      oyuncular.forEach((p, oi) => {
        if (tik % (1 + oi) !== 0) return;              // 0. oyuncu en hizli
        oda.game.handleInput(p, 'press', 110 + oi * 40);
        oda.game.handleInput(p, 'dir', ['left', 'right', 'up', 'down'][(tik + oi) % 4]);
        oda.game.handleInput(p, 'grab',
          { x: 20 + ((tik * (3 + oi)) % 290), y: 40 + ((tik * (7 + oi)) % 130) });
        oda.game.handleInput(p, 'drop', { x: 250 + oi, y: 100 });
      });
    }
    oda.tick(DT);
    tik++;
  }
  return { oda, oyuncular, tik };
}

describe('Tam mac', () => {
  for (const kisi of [2, 3, 4]) {
    test(kisi + ' kisilik mac sampiyona ulasiyor', () => {
      for (let deneme = 0; deneme < 8; deneme++) {
        const { oda, oyuncular } = macOynat(kisi, 2);
        assert.strictEqual(oda.game.phase, 'gameover',
          kisi + ' kisi: mac bitmedi (tur ' + oda.game.tur + ')');
        const sampiyon = oyuncular.find((p) => p.id === oda.game.winner);
        assert.ok(sampiyon, 'sampiyon belirlenmeli');
        assert.ok(sampiyon.wins >= 2, 'sampiyon hedefe ulasmis olmali');
      }
    });
  }

  test('hedefe ulasilmadan mac bitmez', () => {
    const { oda, oyuncular } = macOynat(2, 3);
    const sampiyon = oyuncular.find((p) => p.id === oda.game.winner);
    assert.ok(sampiyon.wins >= 3);
  });

  test('mac ortasinda ayrilan olursa oda lobiye doner', () => {
    const { oda, oyuncular } = odaKur(3);
    for (const p of oyuncular) oda.game.setReady(p, true);
    assert.notStrictEqual(oda.game.phase, 'lobby');
    oda.remove(oyuncular[1]);
    assert.strictEqual(oda.game.phase, 'lobby');
    assert.ok(String(oda.game.notice).includes('AYRILDI'));
  });

  test('biri kopunca mac duraklar', () => {
    const { oda, oyuncular } = odaKur(2);
    for (const p of oyuncular) oda.game.setReady(p, true);
    const faz = oda.game.phase;
    const sayac = oda.game.timer;
    oda.markOffline(oyuncular[0]);
    for (let i = 0; i < 30; i++) oda.tick(DT);        // bir saniye
    assert.strictEqual(oda.game.phase, faz, 'kopukken faz ilerlememeli');
    assert.strictEqual(oda.game.timer, sayac, 'kopukken sayac islememeli');
    assert.ok(oda.game.snapshot().bekle, 'kimi bekledigi bildirilmeli');
  });
});

describe('Sampiyon ekrani', () => {
  test('tekrar oynaya basan kisi otomatik HAZIR olmuyor', () => {
    const { oda, oyuncular } = sampiyonEkranina(4);
    oda.game.requestRematch();
    assert.strictEqual(oda.game.phase, 'lobby');
    for (const p of oyuncular) {
      assert.strictEqual(p.ready, false, p.name + ' istem disi hazir gorunuyor');
      assert.strictEqual(p.wins, 0, 'skorlar sifirlanmali');
    }
  });

  test('lobiye ulasan gec again paketleri kimseyi hazir yapmaz', () => {
    // Iki kisi sampiyon ekraninda neredeyse ayni anda basabilir; ikinci
    // paket oda lobiye dustukten sonra ulasir.
    const { oda, oyuncular } = sampiyonEkranina(2);
    oda.game.requestRematch();
    oda.game.requestRematch();
    oda.game.requestRematch();
    assert.strictEqual(oda.game.phase, 'lobby');
    for (const p of oyuncular) assert.strictEqual(p.ready, false);
  });

  test('iki kisilik odada mac kendiliginden baslamiyor', () => {
    const { oda, oyuncular } = sampiyonEkranina(2);
    oda.game.requestRematch();
    oda.game.setReady(oyuncular[1], true);
    assert.strictEqual(oda.game.phase, 'lobby', 'tek kisi hazirken baslamamali');
    oda.game.setReady(oyuncular[0], true);
    assert.notStrictEqual(oda.game.phase, 'lobby', 'ikisi de hazir olunca baslamali');
    assert.strictEqual(oda.game.tur, 1, 'tur sayaci sifirdan baslamali');
  });

  test('mac ortasinda again gormezden gelinir', () => {
    const { oda, oyuncular } = sampiyonEkranina(2);
    oda.game.requestRematch();
    for (const p of oyuncular) oda.game.setReady(p, true);
    const faz = oda.game.phase;
    oda.game.requestRematch();
    assert.strictEqual(oda.game.phase, faz, 'mac ortasinda lobiye donmemeli');
  });
});

describe('Kablo kesme turu uctan uca', () => {
  test('gosterim -> kesme -> sonuc sirasiyla isliyor', () => {
    const { oda, oyuncular } = odaKur(4, { hedef: 1 });
    for (const p of oyuncular) oda.game.setReady(p, true);

    // Torbadan rastgele oyun geldigi icin turu elle kablo kesmeye ceviriyoruz
    oda.game.mg = wc;
    oda.game.inst = wc.create(oyuncular.map((p) => p.id), 0, {});
    oda.game.phase = 'intro';
    oda.game.timer = 3;

    const asamalar = [];
    let onceki = null, tik = 0;
    while (oda.game.phase !== 'result' && tik < 30 * 40) {
      oda.tick(DT);
      tik++;
      const s = oda.game.snapshot();
      if (s.phase === 'play' && s.st) {
        const asama = s.st.showing ? 'GOSTERIM' : 'KESME';
        if (asama !== onceki) { asamalar.push(asama); onceki = asama; }
        if (!s.st.showing) {
          const inst = oda.game.inst;
          const sirada = inst.order[inst.pl.p0.prog];
          if (sirada !== undefined) {
            oda.game.handleInput(oyuncular[0], 'grab', { x: inst.wires[sirada].x, y: 100 });
          }
        }
      }
    }

    assert.deepStrictEqual(asamalar, ['GOSTERIM', 'KESME']);
    assert.strictEqual(oda.game.phase, 'result');
    assert.deepStrictEqual(oda.game.result.winners, ['p0'], 'sirayi kesen kazanmali');
    assert.ok(JSON.stringify(oda.game.snapshot()).indexOf('"order"') < 0,
      'yayinlanan paket sirayi sizdiriyor');
  });
});
