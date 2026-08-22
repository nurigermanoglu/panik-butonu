/* Oyun yazilari - Rubik (degisken agirlikli, Turkce harfler dahil)
 *
 * ONEMLI FIKIR: yazi OYUN cozunurlugunde (320x180) degil, EKRAN
 * cozunurlugunde ciziliyor. Oyun 320x180'lik bir tuvale cizip ekranda
 * 3-4 kat buyutuyor; yazi da o buyutmeye ugrasaydi bulanik ve tirtikli
 * cikardi. Burada tuvalin olcegi gecici olarak sifirlanip yazi tam
 * ekran pikseliyle ciziliyor, sonra olcek geri veriliyor.
 * Sonuc: oyunun kendisi iri pixel, yazilar ise keskin ve duzgun.
 *
 * Disariya acilan API eskisiyle ayni:
 *   text(ctx, str, x, y, { color, scale, align, shadow, weight })
 *   width(str, scale)
 * x, y ve donen genislik hep OYUN pikseli cinsinden.
 */
(function (PP) {
  'use strict';

  var AILE = '"OyunYazi", "Segoe UI", Roboto, Arial, sans-serif';
  var AGIRLIK = 700;

  // scale 1 -> buyuk harf yuksekligi 7 oyun pikseli olsun (eski fontla ayni,
  // boylece butun ekran yerlesimleri oldugu gibi calismaya devam eder).
  var HEDEF_BASLIK = 7;
  var BOY = 10;                 // olcek 1'deki yazi boyutu (oyun pikseli)
  var baslikOran = 0.7;         // buyuk harf yuksekligi / yazi boyutu
  var olculdu = false;

  function res() { return (PP.res && PP.res.olcek) || 1; }

  // Fontun gercek buyuk harf yuksekligini bir kez olcup BOY'u ona gore ayarla
  function kalibreEt(ctx) {
    if (olculdu) return;
    try {
      var eski = ctx.font;
      ctx.font = AGIRLIK + ' 100px ' + AILE;
      var m = ctx.measureText('HAZIRIM');
      ctx.font = eski;
      if (m && m.actualBoundingBoxAscent > 10) {
        baslikOran = m.actualBoundingBoxAscent / 100;
        BOY = HEDEF_BASLIK / baslikOran;
        olculdu = true;
      }
    } catch (e) { /* olculemezse varsayilanla devam */ }
  }

  function fontStr(s, agirlik) {
    return (agirlik || AGIRLIK) + ' ' + (BOY * s * res()) + 'px ' + AILE;
  }

  function width(str, s) {
    s = s || 1;
    str = String(str);
    if (!str.length) return 0;
    var cv = width._cv || (width._cv = document.createElement('canvas'));
    var c = width._c || (width._c = cv.getContext('2d'));
    kalibreEt(c);
    c.font = fontStr(s, AGIRLIK);
    return c.measureText(str).width / res();     // oyun pikseline cevir
  }

  /**
   * text(ctx, str, x, y, opts)
   *   y = yazinin UST cizgisi (eski bitmap fontla ayni davranis)
   *   opts: { color, scale, align:'left'|'center'|'right', shadow, weight }
   */
  function text(ctx, str, x, y, opts) {
    opts = opts || {};
    str = String(str);
    if (!str.length) return 0;

    var s = opts.scale || 1;
    var ic = res();
    var agirlik = opts.weight || AGIRLIK;

    ctx.save();
    // Olcegi sifirla: bundan sonrasi EKRAN pikseli
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    kalibreEt(ctx);
    ctx.font = fontStr(s, agirlik);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    var w = ctx.measureText(str).width;          // ekran pikseli
    var sx = x * ic;
    if (opts.align === 'center') sx = Math.round(x * ic - w / 2);
    else if (opts.align === 'right') sx = Math.round(x * ic - w);
    else sx = Math.round(sx);

    // y ustten verildigi icin taban cizgisini buyuk harf yuksekligi kadar indir
    var taban = Math.round(y * ic + HEDEF_BASLIK * s * ic);

    if (opts.shadow) {
      ctx.fillStyle = opts.shadow;
      ctx.fillText(str, sx, taban + Math.max(1, Math.round(s * ic)));
    }
    ctx.fillStyle = opts.color || '#f6f6fa';
    ctx.fillText(str, sx, taban);

    ctx.restore();
    return w / ic;                               // oyun pikseli cinsinden genislik
  }

  /**
   * sigdir(yazi, enFazla, olcek)
   *   Verilen genislige sigmayan yaziyi kisaltip sonuna nokta koyar.
   *   Olcum cizimle ayni fontla yapildigi icin sonuc her zaman siger.
   */
  function sigdir(yazi, enFazla, olcek) {
    yazi = String(yazi);
    olcek = olcek || 1;
    if (width(yazi, olcek) <= enFazla) return yazi;
    var k = yazi;
    while (k.length > 1 && width(k + '.', olcek) > enFazla) k = k.slice(0, -1);
    return k + '.';
  }

  PP.font = {
    text: text,
    width: width,
    sigdir: sigdir,
    CH: HEDEF_BASLIK,
    CW: 5,
    GAP: 1,
    aile: AILE
  };
})(window.PP = window.PP || {});
