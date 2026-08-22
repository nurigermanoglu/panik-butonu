'use strict';
// Oda yonetimi: yeniden baglanma anahtarlari ve sohbet kurallari.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { odaKur, sahteConn } = require('./yardimci');
const { Room } = require('../server/room');

describe('Cihaz anahtariyla eski yerine oturma', () => {
  test('dogru anahtar kopan oyuncunun yerini bulur', () => {
    const { oda, oyuncular } = odaKur(2, { ad: () => 'AYSE' });   // ikisi de ayni isim
    const [a, b] = oyuncular;
    a.wins = 3;
    oda.markOffline(a);

    assert.strictEqual(oda.kopukCihazla('cihaz-0'), a);
    assert.strictEqual(oda.kopukCihazla('cihaz-0').wins, 3, 'skoru korunmali');
    assert.strictEqual(oda.kopukCihazla('cihaz-1'), null, 'bagli oyuncunun yeri kapilamaz');
    assert.strictEqual(b.connected, true);
  });

  test('ayni ismi yazan yabanci yeri kapamaz', () => {
    // Eskiden eslesme ISIMLE yapiliyordu: oda kodunu bilen biri kopan
    // oyuncuyla ayni ismi yazip onun slotuna ve skoruna oturabiliyordu.
    const { oda, oyuncular } = odaKur(1, { ad: () => 'AYSE' });
    oda.markOffline(oyuncular[0]);

    for (const deneme of ['AYSE', 'saldirgan', '', undefined, null, 123]) {
      assert.strictEqual(oda.kopukCihazla(deneme), null, 'kabul edilmemeliydi: ' + deneme);
    }
  });

  test('anahtari olmayan oyuncular birbirine karismaz', () => {
    const oda = new Room('TEST');
    const eski = oda.add(sahteConn(), 'AYSE');        // anahtar gondermeyen istemci
    oda.markOffline(eski);
    assert.strictEqual(oda.kopukCihazla(''), null);
    assert.strictEqual(oda.kopukCihazla('herhangi'), null);
  });

  test('anahtar hicbir pakette gorunmez', () => {
    const oda = new Room('TEST');
    oda.add(sahteConn(), 'AYSE', 'gizli-anahtar');
    assert.ok(!('cihaz' in oda.players[0].toJSON()), 'toJSON anahtari sizdiriyor');
    assert.ok(JSON.stringify(oda.game.snapshot()).indexOf('gizli-anahtar') < 0,
      'snapshot anahtari sizdiriyor');
  });
});

describe('Sohbet', () => {
  test('kabul edilen mesaj kaydedilir', () => {
    const { oda, oyuncular } = odaKur(1);
    assert.strictEqual(oda.sohbetEkle(oyuncular[0], 'merhaba'), null);
    assert.strictEqual(oda.sohbet.length, 1);
    assert.strictEqual(oda.sohbet[0].m, 'merhaba');
  });

  test('ard arda yazan kisi "hizli" ile reddedilir', () => {
    const { oda, oyuncular } = odaKur(1);
    oda.sohbetEkle(oyuncular[0], 'birinci');
    assert.strictEqual(oda.sohbetEkle(oyuncular[0], 'ikinci'), 'hizli');
    assert.strictEqual(oda.sohbet.length, 1, 'reddedilen mesaj kaydedilmemeli');
  });

  test('bos ve gorunmez karakterli mesajlar reddedilir', () => {
    const { oda, oyuncular } = odaKur(1);
    const p = oyuncular[0];
    p.sonMesajAn = 0;
    assert.strictEqual(oda.sohbetEkle(p, '   '), 'bos');
    p.sonMesajAn = 0;
    assert.strictEqual(oda.sohbetEkle(p, '​​'), 'bos', 'gorunmez karakterler temizlenmeli');
  });

  test('odada olmayan biri yazamaz', () => {
    const { oda } = odaKur(1);
    const yabanci = { id: 'p9', name: 'X', sonMesajAn: 0 };
    assert.strictEqual(oda.sohbetEkle(yabanci, 'selam'), 'yok');
  });

  test('kontrol karakterleri temizlenir, uzunluk kesilir', () => {
    const { oda, oyuncular } = odaKur(1);
    oda.sohbetEkle(oyuncular[0], 'bir\nyeni\tsatir');
    assert.strictEqual(oda.sohbet[0].m, 'bir yeni satir', 'satir sonu bosluga cevrilmeli');
  });
});
