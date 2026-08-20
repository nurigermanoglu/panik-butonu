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
  RECONNECT_GRACE: 15,
  LOBBY_GRACE: 8,

  // Turlar ilerledikce oyunlar hizlanir (WarioWare gibi).
  // 1. turda seviye 0, SPEED_ROUNDS. turda seviye 1 (en hizli) olur ve orada kalir.
  SPEED_ROUNDS: 10,
  PORT: Number(process.env.PORT) || 3000,
};
