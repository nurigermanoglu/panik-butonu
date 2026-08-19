/* Oyuncu karakterleri - tek bir sayfadan (img/karakterler.png) kirpilarak cizilir */
(function (PP) {
  'use strict';

  // Her karakterin sayfadaki kutusu (otomatik olculdu - kopuk parcalar haric ana govde)
  // sil: kutunun icinde kalan ama karaktere ait olmayan lekeler (kaynak koordinatiyla)
  var KUTU = [
    { x: 42, y: 21, w: 462, h: 290 },     // 0 ejder
    { x: 1059, y: 27, w: 404, h: 300 },   // 1 ucgen
    { x: 582, y: 84, w: 466, h: 212 },    // 2 mor agiz
    { x: 591, y: 321, w: 342, h: 374 },   // 3 baklava
    { x: 93, y: 363, w: 420, h: 382 },    // 4 yildiz
    {
      x: 996, y: 375, w: 326, h: 346,     // 5 hayalet
      // Kutusunun sol altina, alttaki MANTAR karakterinin ust kosesi tasiyor.
      // Ikisi ayni dikdortgende oldugu icin kirpmayla ayrilmiyor; bu yuzden
      // kutu icinde sadece karakterin kendi bagli govdesi tutulur.
      tekParca: true
    },
    { x: 789, y: 699, w: 332, h: 310 },   // 6 mantar
    { x: 213, y: 771, w: 524, h: 214 }    // 7 pembe
  ];

  var ADLAR = ['EJDER', 'UCGEN', 'MOR AGIZ', 'BAKLAVA', 'YILDIZ', 'HAYALET', 'MANTAR', 'PEMBE'];

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
   * Kademeli kucultme: 400 px'lik resmi tek adimda 18 px'e indirmek tirtikli sonuc verir.
   * Bunun yerine hedefe yaklasana kadar yariya indirip son adimda tam boyuta getiriyoruz.
   */
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
    var x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
    var res = hazir(idx, w, h);

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
      ctx.drawImage(res, x, y);
      ctx.restore();
    } else {
      ctx.drawImage(res, x, y);
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
