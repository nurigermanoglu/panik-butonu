'use strict';
// MAC ICI EMOTE
//
// Sohbet mac sirasinda kapali (okumaya vakit yok); emote onun yerini tutar.
// Tek dokunusla gonderilir, iki saniye sonra kendiliginden duser.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, odaKur } = require('./yardimci');
const cfg = require('../server/config');

// Odayi mac fazina alir
function macta(kisi) {
  const { oda, oyuncular } = odaKur(kisi || 2);
  for (const p of oyuncular) oda.game.setReady(p, true);
  return { oda, oyuncular };
}

describe('Gonderme', () => {
  test('mac sirasinda gonderilebilir', () => {
    const { oda, oyuncular } = macta(2);
    oda.game.setEmote(oyuncular[0], 1);
    assert.strictEqual(oda.game.emotes.p0.i, 1);
    assert.strictEqual(oda.game.snapshot().emote.p0, 1);
  });

  test('lobide ve sampiyon ekraninda calismaz', () => {
    const { oda, oyuncular } = odaKur(2);
    assert.strictEqual(oda.game.phase, 'lobby');
    oda.game.setEmote(oyuncular[0], 0);
    assert.deepStrictEqual(oda.game.emotes, {}, 'lobide gonderilebildi');

    oda.game.phase = 'gameover';
    oda.game.setEmote(oyuncular[0], 0);
    assert.deepStrictEqual(oda.game.emotes, {}, 'sampiyon ekraninda gonderilebildi');
  });

  test('gecersiz numaralar reddedilir', () => {
    const { oda, oyuncular } = macta(2);
    for (const kotu of [-1, cfg.EMOTE_COUNT, 99, 1.5, NaN, 'a', null, undefined, {}]) {
      oyuncular[0].sonEmoteAn = 0;          // hiz sinirini devre disi birak
      oda.game.setEmote(oyuncular[0], kotu);
      assert.deepStrictEqual(oda.game.emotes, {}, 'kabul edildi: ' + String(kotu));
    }
  });

  test('butun gecerli numaralar kabul edilir', () => {
    const { oda, oyuncular } = macta(2);
    for (let i = 0; i < cfg.EMOTE_COUNT; i++) {
      oyuncular[0].sonEmoteAn = 0;
      oda.game.setEmote(oyuncular[0], i);
      assert.strictEqual(oda.game.emotes.p0.i, i);
    }
  });

  test('ard arda gonderme sinirlanir', () => {
    const { oda, oyuncular } = macta(2);
    oda.game.setEmote(oyuncular[0], 0);
    oda.game.setEmote(oyuncular[0], 3);
    assert.strictEqual(oda.game.emotes.p0.i, 0, 'ikinci tepki hemen kabul edildi');

    // Hiz siniri gectikten sonra yenisi gecmeli
    oyuncular[0].sonEmoteAn = Date.now() - cfg.EMOTE_ARA_MS - 10;
    oda.game.setEmote(oyuncular[0], 3);
    assert.strictEqual(oda.game.emotes.p0.i, 3);
  });

  test('her oyuncunun kendi balonu olur', () => {
    const { oda, oyuncular } = macta(3);
    oda.game.setEmote(oyuncular[0], 0);
    oda.game.setEmote(oyuncular[1], 2);
    const s = oda.game.snapshot();
    assert.strictEqual(s.emote.p0, 0);
    assert.strictEqual(s.emote.p1, 2);
    assert.strictEqual(s.emote.p2, undefined);
  });
});

describe('Dusme', () => {
  test('suresi dolan balon kendiliginden duser', () => {
    const { oda, oyuncular } = macta(2);
    oda.game.setEmote(oyuncular[0], 1);
    assert.ok(oda.game.snapshot().emote, 'balon olusmadi');

    // Zamani geriye alip temizligi calistir
    oda.game.emotes.p0.at = Date.now() - cfg.EMOTE_SURE_MS - 50;
    oda.game.emoteTemizle();
    assert.strictEqual(oda.game.snapshot().emote, null, 'balon dusmedi');
  });

  test('suresi dolmayan balon kalir', () => {
    const { oda, oyuncular } = macta(2);
    oda.game.setEmote(oyuncular[0], 1);
    oda.game.emoteTemizle();
    assert.strictEqual(oda.game.snapshot().emote.p0, 1);
  });

  test('tick sirasinda temizlik calisiyor', () => {
    const { oda, oyuncular } = macta(2);
    oda.game.setEmote(oyuncular[0], 1);
    oda.game.emotes.p0.at = Date.now() - cfg.EMOTE_SURE_MS - 50;
    oda.tick(DT);
    assert.strictEqual(oda.game.snapshot().emote, null);
  });

  test('balon yoksa snapshot null gonderir', () => {
    const { oda } = macta(2);
    assert.strictEqual(oda.game.snapshot().emote, null,
      'bos nesne yerine null gonderilmeli');
  });
});

describe('Temizlik', () => {
  test('odadan ayrilanin balonu silinir', () => {
    const { oda, oyuncular } = macta(3);
    oda.game.setEmote(oyuncular[0], 1);
    oda.remove(oyuncular[0]);
    assert.strictEqual(oda.game.emotes.p0, undefined);
  });

  test('lobiye donunce balonlar sifirlanir', () => {
    const { oda, oyuncular } = macta(2);
    oda.game.setEmote(oyuncular[0], 1);
    oda.game.toLobby(null);
    assert.deepStrictEqual(oda.game.emotes, {});
  });
});
