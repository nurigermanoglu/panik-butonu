'use strict';
// SURUKLE-BIRAK OYUNLARINDA BOTUN EL HIZI
//
// Dosya Silme, Sekil Yerlestir ve Puzzle'da bot gorevi her zorlukta
// tamamliyor. Fark yalnizca BITIRME SURESINE yansiyor - derece() esitligi
// onunla bozuyor. Yani buradaki sayi dogrudan "insanin kazanma sansi" demek.
//
// Bot hamle araligina birakilinca (botAraligi) zor bot Puzzle'i 0.4, Sekil
// Yerlestir'i 0.8, Dosya Silme'yi 1.6 saniyede bitiriyordu. Bu zorluk degil:
// oyun, insan ekrana dokunmadan bitiyor. Hamle araligini yavaslatmak da
// cozum degil, cunku ayni carpan butun oyunlarda gecerli - Engelden Kac'ta
// botun hizli olmasi GEREKIYOR.
//
// Onun yerine her surukleme bir INSAN ELI SURESI harciyor:
//
//     temel sure (uzan - tut - tasi - birak)  +  oyunun dusunme payi
//
// Dusunme payi oyunun kendisinden gelir: cop kutusu tek ve belli oldugu
// icin Dosya Silme'de dusunulecek bir sey yok; sekil-yuva eslesmesi bir
// bakista goruluyor; Puzzle'da ise parcanin hangi bosluga ait oldugunu
// bulmak gercekten zaman aliyor.
//
// NOT: bu sure bir ALT SINIR. Kolay botta hamle araligi zaten daha uzun
// olabiliyor; o zaman aralik gecerli olur.

const TEMEL = [1.6, 0.95, 0.62];   // saniye/surukleme: kolay, orta, zor

// Ilk suruklemeden onceki "ekrana bakma" payi, el suresinin orani olarak.
// Insan da once bakip sonra uzaniyor.
const BAKMA = 0.6;

function elSuresi(zorluk, dusunme) {
  const t = TEMEL[zorluk] !== undefined ? TEMEL[zorluk] : TEMEL[1];
  return t + (dusunme || 0);
}

/**
 * elHazir(inst, pid, zorluk, dusunme)
 *   Botun bu oyuncu icin yeni bir surukleme yapmaya hakki var mi?
 *   Varsa saati isler ve true doner. inst.t (tur icindeki saniye) kullanilir.
 */
function elHazir(inst, pid, zorluk, dusunme) {
  if (!inst.botEl) inst.botEl = {};
  const bekle = elSuresi(zorluk, dusunme);
  if (inst.botEl[pid] === undefined) inst.botEl[pid] = -bekle * (1 - BAKMA);
  if (inst.t - inst.botEl[pid] < bekle) return false;
  inst.botEl[pid] = inst.t;
  return true;
}

module.exports = { elSuresi, elHazir };
