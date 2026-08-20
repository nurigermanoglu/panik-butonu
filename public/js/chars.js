/* Oyuncu karakterleri - tek bir sayfadan (img/karakterler.png) kirpilarak cizilir */
(function (PP) {
  'use strict';

  // Her karakterin sayfadaki kutusu (otomatik olculdu)
  // tekParca: kutu icinde komsu karakterden tasan parcalar varsa temizler
  var KUTU = [
    { x: 22, y: 26, w: 168, h: 108 },     // 0 ejder
    { x: 252, y: 13, w: 184, h: 113 },    // 1 kral (agiz + tac)
    { x: 438, y: 26, w: 150, h: 110 },    // 2 ucgen
    // Yildizin kutusunun altina, pembe karakterin ucu 2 piksel giriyor:
    // kutu icinde sadece kendi bagli govdesi tutulur.
    { x: 22, y: 154, w: 178, h: 184, tekParca: true },   // 3 yildiz
    { x: 220, y: 148, w: 154, h: 166 },   // 4 baklava
    { x: 386, y: 172, w: 136, h: 146 },   // 5 hayalet
    { x: 36, y: 338, w: 154, h: 156 },    // 6 pembe
    { x: 262, y: 330, w: 170, h: 152 }    // 7 mantar
  ];

  var ADLAR = ['EJDER', 'KRAL', 'UCGEN', 'YILDIZ', 'BAKLAVA', 'HAYALET', 'PEMBE', 'MANTAR'];

  var img = new Image();
  var yuklendi = false;
  img.onload = function () { yuklendi = true; };
  img.src = 'img/karakterler.png';

  var onbellek = {};

  function normalize(idx) {
    idx = idx | 0;
    return ((idx % KUTU.length) + KUTU.length) % KUTU.length;
  }

  function tuval(w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  }

  function yumusak(ctx) {
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Kutunun icinde birden fazla kopuk parca varsa yalnizca EN BUYUK bagli parcayi
   * birakir (komsu karakterden tasan kisimlar boylece silinir).
   */
  function tekParcaYap(cv) {
    var c2 = cv.getContext('2d', { willReadFrequently: true });
    var W = cv.width, H = cv.height;
    var d = c2.getImageData(0, 0, W, H);
    var px = d.data;
    var etiket = new Int32Array(W * H).fill(-1);
    var enBuyukId = -1, enBuyukAlan = 0, id = 0;
    var kuyruk = new Int32Array(W * H);

    for (var s = 0; s < W * H; s++) {
      if (px[s * 4 + 3] < 60 || etiket[s] >= 0) continue;
      var bas = 0, son = 0, alan = 0;
      kuyruk[son++] = s; etiket[s] = id;
      while (bas < son) {
        var p = kuyruk[bas++], x = p % W, y = (p / W) | 0;
        alan++;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            var nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            var q = ny * W + nx;
            if (px[q * 4 + 3] >= 60 && etiket[q] < 0) { etiket[q] = id; kuyruk[son++] = q; }
          }
        }
      }
      if (alan > enBuyukAlan) { enBuyukAlan = alan; enBuyukId = id; }
      id++;
    }
    if (id <= 1) return;                       // tek parca zaten
    for (var i = 0; i < W * H; i++) {
      if (etiket[i] !== enBuyukId) px[i * 4 + 3] = 0;
    }
    c2.putImageData(d, 0, 0);
  }

  function hazir(idx, w, h) {
    if (!yuklendi) return null;
    var anahtar = idx + '@' + w + 'x' + h;
    if (onbellek[anahtar]) return onbellek[anahtar];

    var k = KUTU[idx];

    // 1) kirpilmis tam boy kopya (bir kez uretilip saklanir)
    var tamAnahtar = 'tam' + idx;
    var tam = onbellek[tamAnahtar];
    if (!tam) {
      tam = tuval(k.w, k.h);
      tam.getContext('2d').drawImage(img, k.x, k.y, k.w, k.h, 0, 0, k.w, k.h);
      if (k.tekParca) tekParcaYap(tam);
      onbellek[tamAnahtar] = tam;
    }
    var cur = tam;

    // 2) yariya indire indire hedefe yaklas
    var cw = k.w, ch = k.h;
    while (cw > w * 2 && ch > h * 2) {
      var nw = Math.max(w, Math.round(cw / 2));
      var nh = Math.max(h, Math.round(ch / 2));
      var ara = tuval(nw, nh);
      var ac = ara.getContext('2d');
      yumusak(ac);
      ac.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
      cur = ara; cw = nw; ch = nh;
    }

    // 4) son adim: tam hedef boyut
    var son = tuval(w, h);
    var scx = son.getContext('2d');
    yumusak(scx);
    scx.drawImage(cur, 0, 0, cw, ch, 0, 0, w, h);

    onbellek[anahtar] = son;
    return son;
  }

  /**
   * ciz(ctx, idx, cx, cy, maxW, maxH, opts)
   *   (cx,cy) merkez olacak sekilde, kutuya SIGDIRARAK cizer (oran bozulmaz).
   *   opts: { dead: true } -> soluk
   */
  function ciz(ctx, idx, cx, cy, maxW, maxH, opts) {
    idx = normalize(idx);
    var k = KUTU[idx];
    var olcek = Math.min(maxW / k.w, maxH / k.h);
    var w = Math.max(4, Math.round(k.w * olcek));
    var h = Math.max(4, Math.round(k.h * olcek));
    // Ekranda kac kat gorunuyorsa o oranda detayli hazirla
    var ic = (PP.res && PP.res.olcek) || 1;
    // Konum EKRAN pikseline oturtulur, oyun pikseline degil: 3x olcekte uc kat
    // daha ince konum demek. Tam ekran pikseline denk geldigi icin bulaniklik
    // olusmaz, ama hareket eden karakter adim adim ziplamaz.
    var x = Math.round((cx - w / 2) * ic) / ic;
    var y = Math.round((cy - h / 2) * ic) / ic;
    var res = hazir(idx, w * ic, h * ic);

    if (!res) {
      var g = PP.gfx;
      g.frame(ctx, x, y, w, h, g.PAL.dark, g.PAL.black);
      return { w: w, h: h };
    }

    // Kucultulmus kopya zaten yumusak; cizerken de yumusak birakiyoruz ki
    // 1:1 olmayan durumlarda tirtik olusmasin.
    var eskiSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    if (opts && opts.dead) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.drawImage(res, x, y, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(res, x, y, w, h);
    }
    ctx.imageSmoothingEnabled = eskiSmooth;
    return { w: w, h: h };
  }

  PP.chars = {
    ciz: ciz,
    adet: KUTU.length,
    ad: function (idx) { return ADLAR[normalize(idx)]; },
    hazirMi: function () { return yuklendi; }
  };
})(window.PP = window.PP || {});
