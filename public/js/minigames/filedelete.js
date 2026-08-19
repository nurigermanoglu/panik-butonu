/* DOSYA SILME - ekran cizimi (gercek klasor ve cop kutusu resimleriyle) */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  // kirp = resmin icindeki cizimin kutusu (olculdu), w/h = oyunda cizilecek boyut
  var KAYNAK = {
    klasor: { src: 'img/klasor.png', kirp: { x: 13, y: 54, w: 496, h: 391 }, w: 30, h: 24 },
    cop: { src: 'img/cop.png', kirp: { x: 63, y: 16, w: 375, h: 475 }, w: 46, h: 58 }
  };

  var img = {}, yuklendi = {}, onbellek = {};
  Object.keys(KAYNAK).forEach(function (ad) {
    yuklendi[ad] = false;
    onbellek[ad] = null;
    var im = new Image();
    im.onload = function () { yuklendi[ad] = true; };
    im.src = KAYNAK[ad].src;
    img[ad] = im;
  });

  function hazir(ad) {
    if (!yuklendi[ad]) return null;
    var ic = (PP.res && PP.res.olcek) || 1;
    var anahtar = ad + '@' + ic;
    if (!onbellek[anahtar]) {
      var k = KAYNAK[ad];
      var cv = document.createElement('canvas');
      cv.width = k.w * ic; cv.height = k.h * ic;
      var c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in c2) c2.imageSmoothingQuality = 'high';
      c2.drawImage(img[ad], k.kirp.x, k.kirp.y, k.kirp.w, k.kirp.h, 0, 0, k.w * ic, k.h * ic);
      onbellek[anahtar] = cv;
    }
    return onbellek[anahtar];
  }

  function klasorCiz(ctx, cx, cy) {
    var res = hazir('klasor'), k = KAYNAK.klasor;
    var x = Math.round(cx - k.w / 2), y = Math.round(cy - k.h / 2);
    if (res) ctx.drawImage(res, x, y, k.w, k.h);
    else g.frame(ctx, x, y, k.w, k.h, P.orange, P.black);
  }

  PP.MG = PP.MG || {};
  PP.MG.filedelete = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you];

      // ---- eski bilgisayar masaustu (mavi) ----
      var MAVI = ben && ben.fl ? '#2f6a8a' : '#2f4f8f';
      var MAVI2 = ben && ben.fl ? '#37789b' : '#37599e';
      g.rect(ctx, 0, 0, v.W, v.H, MAVI);
      for (var dy = v.top; dy < v.H; dy += 2) {                 // hafif dither dokusu
        for (var dx = (dy / 2) % 2 ? 0 : 1; dx < v.W; dx += 2) {
          g.rect(ctx, dx, dy, 1, 1, MAVI2);
        }
      }

      // ---- alttaki gorev cubugu ----
      var tby = v.H - 14;
      g.rect(ctx, 0, tby, v.W, 14, '#b8b8c4');
      g.rect(ctx, 0, tby, v.W, 1, P.white);                     // ust isik
      g.rect(ctx, 0, v.H - 1, v.W, 1, '#6a6a78');
      // baslat butonu
      g.rect(ctx, 3, tby + 2, 40, 10, '#c8c8d4');
      g.rect(ctx, 3, tby + 2, 40, 1, P.white);
      g.rect(ctx, 3, tby + 11, 40, 1, '#6a6a78');
      g.rect(ctx, 6, tby + 4, 6, 6, P.blue);
      f.text(ctx, 'BASLAT', 15, tby + 4, { color: '#20202c', scale: 1 });
      // saat kutusu
      g.rect(ctx, v.W - 34, tby + 2, 31, 10, '#a8a8b4');
      f.text(ctx, '13:37', v.W - 32, tby + 4, { color: '#20202c', scale: 1 });

      // ---- cop kutusu ----
      var tr = st.trash;
      var kres = hazir('cop'), kk = KAYNAK.cop;
      var kx = Math.round(tr.x + tr.w / 2 - kk.w / 2);
      var ky = Math.round(tr.y + tr.h / 2 - kk.h / 2);
      // birakma bolgesini belli eden hafif secim cercevesi (masaustu ikonu gibi)
      for (var kd = 0; kd < tr.w; kd += 4) g.rect(ctx, tr.x + kd, tr.y, 2, 1, '#8fb0e0');
      for (var kd2 = 0; kd2 < tr.w; kd2 += 4) g.rect(ctx, tr.x + kd2, tr.y + tr.h - 1, 2, 1, '#8fb0e0');
      for (var ke = 0; ke < tr.h; ke += 4) {
        g.rect(ctx, tr.x, tr.y + ke, 1, 2, '#8fb0e0');
        g.rect(ctx, tr.x + tr.w - 1, tr.y + ke, 1, 2, '#8fb0e0');
      }
      if (kres) ctx.drawImage(kres, kx, ky, kk.w, kk.h);
      else g.frame(ctx, kx, ky, kk.w, kk.h, P.gray, P.black);

      f.text(ctx, 'COP', tr.x + tr.w / 2, tr.y - 10, {
        color: P.light, scale: 1, align: 'center', shadow: P.black
      });

      if (ben) {
        // ---- duran dosyalar ----
        for (var i = 0; i < ben.f.length; i++) {
          var q = ben.f[i];
          if (q.st !== 0) continue;
          klasorCiz(ctx, q.x, q.y);
        }

        // ---- elimdeki dosya: YEREL parmak konumunda (gecikmesiz) ----
        if (ben.h >= 0) {
          var hq = ben.f[ben.h];
          var hx = v.ptr && v.ptr.down ? v.ptr.x : hq.x;
          var hy = v.ptr && v.ptr.down ? v.ptr.y : hq.y;
          klasorCiz(ctx, hx, hy);
        }
      }

      // ---- skorlar ----
      var n = v.players.length, slotW = v.W / n;
      for (var m = 0; m < n; m++) {
        var p = v.players[m];
        var pd = st.pl[p.id];
        f.text(ctx, p.name + ' ' + (pd ? pd.s : 0) + '/' + st.total,
          Math.round(slotW * m + slotW / 2), v.top + 2, {
            color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
          });
      }

      f.text(ctx, 'SURUKLE VE COPE BIRAK', 52, v.H - 10, {
        color: '#20202c', scale: 1
      });
    }
  };
})(window.PP = window.PP || {});
