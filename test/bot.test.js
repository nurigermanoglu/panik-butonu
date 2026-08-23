'use strict';
// BOTLAR
//
// Bot, gercek oyuncu gibi slot/renk/karakter alir ama soketi yoktur.
// Sunucuda oynar ve yalnizca snap() ciktisini - yani istemcinin de gordugu
// bilgiyi - kullanir.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DT, odaKur, sahteConn } = require('./yardimci');
const { Room } = require('../server/room');
const cfg = require('../server/config');

describe('Bot ekleme', () => {
  test('bot gercek oyuncu gibi yerini alir', () => {
    const { oda } = odaKur(1);
    const bot = oda.botEkle();
    assert.ok(bot, 'bot eklenemedi');
    assert.strictEqual(bot.bot, true);
    assert.strictEqual(oda.players.length, 2);
    assert.strictEqual(bot.ready, true, 'bot her zaman hazir olmali');
    assert.notStrictEqual(bot.slot, oda.players[0].slot, 'ayni slot verildi');
  });

  test('botlar farkli isim ve karakter alir', () => {
    const { oda } = odaKur(1);
    oda.botEkle();
    oda.botEkle();
    const botlar = oda.players.filter((p) => p.bot);
    assert.strictEqual(botlar.length, 2);
    assert.notStrictEqual(botlar[0].name, botlar[1].name);
    const karakterler = oda.players.map((p) => p.char);
    assert.strictEqual(new Set(karakterler).size, karakterler.length,
      'iki oyuncu ayni karakteri aldi');
  });

  test('odada en az bir insan kalir', () => {
    const { oda } = odaKur(1);
    let eklenen = 0;
    for (let i = 0; i < 10; i++) if (oda.botEkle()) eklenen++;
    assert.ok(oda.insanSayisi >= 1, 'oda sadece botlardan olustu');
    assert.ok(oda.botSayisi <= cfg.MAX_PLAYERS - 1);
    assert.strictEqual(oda.players.length, cfg.MAX_PLAYERS);
  });

  test('dolu odaya bot eklenmez', () => {
    const { oda } = odaKur(cfg.MAX_PLAYERS);
    assert.strictEqual(oda.botEkle(), null);
  });

  test('bot cikarilabilir', () => {
    const { oda } = odaKur(1);
    oda.botEkle();
    oda.botEkle();
    assert.strictEqual(oda.botSayisi, 2);
    oda.botCikar();
    assert.strictEqual(oda.botSayisi, 1);
    oda.botCikar();
    assert.strictEqual(oda.botSayisi, 0);
    assert.strictEqual(oda.botCikar(), null, 'bot yokken cikarma denendi');
    assert.strictEqual(oda.players.length, 1, 'insan silindi');
  });

  test('bot oyuncu listesinde isaretli gelir', () => {
    const { oda } = odaKur(1);
    oda.botEkle();
    const liste = oda.playersJSON();
    const bot = liste.find((p) => p.bot);
    assert.ok(bot, 'bot bayragi yayinlanmiyor');
    const insan = liste.find((p) => !p.bot);
    assert.strictEqual(insan.bot, undefined, 'insana bot bayragi eklenmis');
  });
});

describe('Baglanti kurallari', () => {
  test('botlara paket gonderilmez', () => {
    // Botun soketi yok; broadcast onu atlamazsa null.send patlar.
    const oda = new Room('T');
    const c = sahteConn();
    let gonderilen = 0;
    c.send = () => { gonderilen++; };
    oda.add(c, 'AYSE', 'c0');
    oda.botEkle();
    oda.broadcast({ t: 'test' });          // patlamamali
    assert.strictEqual(gonderilen, 1, 'sadece insana gonderilmeliydi');
  });

  test('sadece bot kalirsa oda bos sayilir', () => {
    const { oda, oyuncular } = odaKur(1);
    oda.botEkle();
    assert.strictEqual(oda.isEmpty, false);
    oda.remove(oyuncular[0]);              // insan cikti
    assert.strictEqual(oda.isEmpty, true, 'botlarla dolu oda acik kaldi');
  });

  test('bot kopmus sayilmaz', () => {
    const { oda } = odaKur(1);
    oda.botEkle();
    assert.strictEqual(oda.graceLeft(), 0, 'bot bekleme sayaci baslatti');
    assert.strictEqual(oda.game.snapshot().bekle, null);
  });
});

describe('Mac akisi', () => {
  test('insan hazir olunca bot bekletmez', () => {
    const { oda, oyuncular } = odaKur(1);
    oda.botEkle();
    oda.game.setReady(oyuncular[0], true);
    assert.notStrictEqual(oda.game.phase, 'lobby', 'mac baslamadi');
  });

  test('sadece botlardan olusan oda mac baslatmaz', () => {
    const oda = new Room('T');
    oda.botEkle();
    oda.botEkle();
    oda.game.tryStart();
    assert.strictEqual(oda.game.phase, 'lobby');
  });

  test('lobiye donunce bot hazir kalir, insan sifirlanir', () => {
    const { oda, oyuncular } = odaKur(1);
    const bot = oda.botEkle();
    oda.game.setReady(oyuncular[0], true);
    oda.game.toLobby(null);
    assert.strictEqual(bot.ready, true, 'bot hazirligi sifirlandi');
    assert.strictEqual(oyuncular[0].ready, false);
  });

  test('bot gercekten oynuyor ve puan aliyor', () => {
    const oda = new Room('T');
    const insan = oda.add(sahteConn(), 'AYSE', 'c0');
    oda.botEkle();
    oda.botEkle();
    oda.winsNeeded = 3;
    oda.game.setReady(insan, true);

    let tik = 0;
    while (oda.game.phase !== 'gameover' && tik < 30 * 60 * 10) {
      if (oda.game.phase === 'play') {
        oda.game.handleInput(insan, 'press', 130);
        oda.game.handleInput(insan, 'dir', 'left');
        oda.game.handleInput(insan, 'grab', { x: 20 + (tik * 7) % 280, y: 50 + (tik * 11) % 110 });
        oda.game.handleInput(insan, 'drop', { x: 250, y: 110 });
      }
      oda.tick(DT);
      tik++;
    }
    assert.strictEqual(oda.game.phase, 'gameover', 'mac bitmedi');
    const botlar = oda.players.filter((p) => p.bot);
    const toplam = botlar.reduce((t, p) => t + p.wins, 0);
    assert.ok(toplam > 0, 'botlar hic puan alamadi - oynamiyor olabilirler');
  });

  test('bot mac sonu istatistiklerine de girer', () => {
    const { oda, oyuncular } = odaKur(1);
    oda.botEkle();
    oda.game.setReady(oyuncular[0], true);
    // Bir tur elle oynat
    oda.game.inst = {
      derece: () => [['p1'], ['p0']],
      winners: () => ['p1'],
      text: () => '',
      snap: () => ({}),
    };
    oda.game.finishRound();
    assert.strictEqual(oda.game.istatOku('p1').kazanma, 1, 'botun kazanmasi sayilmadi');
  });
});

describe('Bot davranisi', () => {
  test('refleks turunda isaret gelmeden basmaz', () => {
    // Erken basmak "yanmak" demek; bot ekranda isareti gorene kadar beklemeli.
    const oda = new Room('T');
    const insan = oda.add(sahteConn(), 'AYSE', 'c0');
    const bot = oda.botEkle();
    oda.game.setReady(insan, true);

    const reflex = require('../server/minigames/reflex');
    oda.game.mg = reflex;
    oda.game.inst = reflex.create([insan.id, bot.id], 0);
    oda.game.phase = 'play';
    oda.game.timer = oda.game.inst.sure;

    // Isaret gelene kadar ilerlet
    let guvenlik = 0;
    while (!oda.game.inst.signal && guvenlik < 2000) {
      oda.game.botTick(DT);
      oda.game.inst.update(DT);
      guvenlik++;
    }
    assert.strictEqual(oda.game.inst.fouled[bot.id], false,
      'bot isaret gelmeden basip yandi');
  });

  test('botTick yalnizca play fazinda calisir', () => {
    const oda = new Room('T');
    const insan = oda.add(sahteConn(), 'AYSE', 'c0');
    oda.botEkle();
    oda.game.setReady(insan, true);
    oda.game.phase = 'intro';
    // Patlamamali (inst intro'da da var ama hamle yapilmamali)
    oda.game.botTick(DT);
    oda.game.phase = 'lobby';
    oda.game.inst = null;
    oda.game.botTick(DT);
    assert.ok(true);
  });
});
