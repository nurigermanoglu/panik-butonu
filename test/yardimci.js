'use strict';
// Testlerin ortak kurulum kodu.
//
// Sunucu tarafi saf JavaScript oldugu icin test etmek icin ne tarayici ne de
// gercek soket gerekiyor: sahte baglantilarla gercek Room/Game nesneleri
// kurulup zaman elle ilerletiliyor. Boylece bir maci saniyeler icinde
// bastan sona oynatabiliyoruz.

const { Room } = require('../server/room');

const DT = 1 / 30;            // bir sunucu tiki (config.TICK_HZ = 30)

// Room gercek bir soket bekler; testin ihtiyaci bu kadari.
function sahteConn() {
  return { rtt: 20, send() {}, sendJSON() {}, close() {} };
}

/**
 * odaKur(kisi, ayar)
 *   kisi  : oyuncu sayisi
 *   ayar  : { kod, hedef, ad(i) }
 *   doner : { oda, oyuncular }
 */
function odaKur(kisi, ayar) {
  ayar = ayar || {};
  const oda = new Room(ayar.kod || 'TEST');
  const oyuncular = [];
  for (let i = 0; i < kisi; i++) {
    const ad = ayar.ad ? ayar.ad(i) : 'OYUNCU' + i;
    oyuncular.push(oda.add(sahteConn(), ad, 'cihaz-' + i));
  }
  if (ayar.hedef) oda.winsNeeded = ayar.hedef;
  return { oda, oyuncular };
}

// Bir mini oyun ornegini verilen sure kadar ilerletir.
function ilerlet(inst, saniye) {
  const adet = Math.round(saniye / DT);
  for (let i = 0; i < adet; i++) inst.update(DT);
}

/**
 * Odayi sampiyon ekranina getirir (turlari gercekten oynamadan).
 * Sampiyon ekranini test etmek isteyen testler icin kisa yol.
 */
function sampiyonEkranina(kisi) {
  const { oda, oyuncular } = odaKur(kisi, { hedef: 1 });
  for (const p of oyuncular) oda.game.setReady(p, true);
  // Hedef artik kisi sayisina gore olcekleniyor (derece puani):
  // 4 kisilik odada ayar 1 -> 3 puan. Sampiyon yapmak icin tam hedefi veriyoruz.
  oyuncular[0].wins = oda.game.hedefPuan;
  oda.game.phase = 'result';
  oda.game.timer = 0;
  oda.game.afterResult();
  return { oda, oyuncular };
}

module.exports = { DT, sahteConn, odaKur, ilerlet, sampiyonEkranina };
