'use strict';
// Tum oyun ayarlari tek yerde.
// 4 kisilik yapmak icin: MAX_PLAYERS = 4  (baska hicbir yeri degistirmek gerekmez)
module.exports = {
  MAX_PLAYERS: 4,
  // Oyun, odadaki herkes "hazir" deyince baslar. MIN_PLAYERS bunun icin gereken en az kisi.
  // 4 kisiye gecerken: MIN_PLAYERS 4 = herkes gelene kadar bekler (gec katilan disarida kalmaz),
  //                    MIN_PLAYERS 2 = hazir olanlarla erken baslar.
  MIN_PLAYERS: 2,
  WINS_NEEDED: 5,     // varsayilan hedef; odayi kuran lobide degistirebilir
  WINS_MIN: 1,
  WINS_MAX: 9,
  CHAR_COUNT: 8,      // public/img/karakterler.png icindeki karakter sayisi
  TICK_HZ: 30,        // sunucu simulasyon hizi
  INTRO_TIME: 3.0,    // "hazir ol" ekrani (saniye)
  RESULT_TIME: 3.0,   // tur sonucu ekrani (saniye)

  // Baglanti kopunca oyuncunun yeri ne kadar tutulur (saniye).
  // Mac ortasinda uzun tutulur - telefon kilitlenmesi/tunel/wifi takilmasi
  // yuzunden mac bozulmasin. Lobide beklemenin anlami yok, kisa tutulur.
  // Sohbet: mesaj uzunlugu, odada saklanan gecmis, ard arda yazma araligi
  CHAT_MAX_LEN: 120,
  CHAT_HISTORY: 30,
  CHAT_MIN_ARA_MS: 600,
  // Bot isimleri. En fazla bu kadar bot eklenebilir (odada en az bir insan
  // kalmasi icin zaten MAX_PLAYERS - 1 ile de sinirli).
  BOT_ADLARI: ['ROBOT', 'MAKINE', 'DEVRE'],
  // Bot zorlugu: 0 kolay, 1 orta, 2 zor. Hamle sikligini belirler -
  // kolay bot seyrek, zor bot sik hamle yapar.
  BOT_ZORLUK: 1,
  BOT_ZORLUK_ADLARI: ['KOLAY', 'ORTA', 'ZOR'],
  // Hamle araligi carpani (buyuk = yavas bot).
  // NOT: bunu ZOR icin daha da dusurmek cazip ama yanlis: surukle-birak
  // oyunlarinda (Puzzle, Sekil Yerlestir) bot gorevi zaten tamamliyor,
  // tempoyu artirmak yalnizca bitirme suresini insanin dokunamayacagi
  // kadar kisaltiyor (olculdu: 0.3 carpaninda Puzzle 0.2 sn). Zorluk
  // gereken yere, oyunun kendi bot mantigindan verilir.
  BOT_ZORLUK_TEMPO: [2.2, 1, 0.55],

  RECONNECT_GRACE: 15,
  LOBBY_GRACE: 8,

  // Turlar ilerledikce oyunlar hizlanir (WarioWare gibi).
  // 1. turda seviye 0, SPEED_ROUNDS. turda seviye 1 (en hizli) olur ve orada kalir.
  SPEED_ROUNDS: 10,
  PORT: Number(process.env.PORT) || 3000,
};
