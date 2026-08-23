'use strict';
// Mini oyunlarin ortak siralama yardimcisi.
//
// Her mini oyun bir derece() metodu sunar: oyuncular birinciden sonuncuya
// dogru gruplanmis olarak doner. Esit olanlar AYNI grupta olur:
//
//   [['p0'], ['p1', 'p2'], ['p3']]   -> p0 birinci, p1 ve p2 ikinci, p3 dorduncu
//
// gameLoop bu gruplara gore puan dagitir (bkz. finishRound).

/**
 * dereceler(ids, olcu)
 *   olcu(id) -> sayi. KUCUK DEGER = IYI DERECE.
 *   Ayni olcuye sahip oyuncular ayni grupta toplanir.
 *
 * Oyunlarin cogunda "iyi" buyuk sayidir (skor gibi); onlar olcuyu negatif
 * dondurur. Tek bir yon kurali olmasi karsilastirmayi basitlestiriyor.
 */
function dereceler(ids, olcu) {
  const liste = ids.map((id) => ({ id: id, d: olcu(id) }));
  liste.sort((a, b) => a.d - b.d);

  const gruplar = [];
  for (const kayit of liste) {
    const son = gruplar.length ? gruplar[gruplar.length - 1] : null;
    // Kayan nokta karsilastirmasi: 1e-9 altindaki fark "esit" sayilir
    if (son && Math.abs(son.d - kayit.d) < 1e-9) son.ids.push(kayit.id);
    else gruplar.push({ d: kayit.d, ids: [kayit.id] });
  }
  return gruplar.map((g) => g.ids);
}

module.exports = { dereceler };
