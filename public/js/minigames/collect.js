/* DUSENLERI YAKALA - ekran cizimi (herkes ayni sahada) */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;
  // Ekrandaki her yazi dil dosyasindan gelir (bkz. js/dil.js)
  var t = function () { return PP.dil.t.apply(PP.dil, arguments); };

  // Toplanacak yildiz (7x7). Bomba icin oyunun kendi bomba resmi kullanilir.
  var YILDIZ = [
    '...#...',
    '...#...',
    '.#####.',
    '..###..',
    '.##.##.',
    '.#...#.',
    '#.....#'
  ];

  // Bomba gorseli - Kostebek Avi ve Sicak Patates ile ayni resim
  var BOMBA = { src: 'img/bomba.png', kirp: { x: 62, y: 69, w: 483, h: 383 }, w: 20, h: 16 };
  var bombaImg = new Image(), bombaYuklendi = false, bombaOnbellek = null;
  bombaImg.onload = function () { bombaYuklendi = true; };
  bombaImg.src = BOMBA.src;

  function bombaHazir() {
    if (!bombaYuklendi) return null;
    var ic = (PP.res && PP.res.olcek) || 1;
    if (!bombaOnbellek || bombaOnbellek._ic !== ic) {
      var cv = document.createElement('canvas');
      cv.width = BOMBA.w * ic; cv.height = BOMBA.h * ic;
      var c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in c2) c2.imageSmoothingQuality = 'high';
      c2.drawImage(bombaImg, BOMBA.kirp.x, BOMBA.kirp.y, BOMBA.kirp.w, BOMBA.kirp.h,
        0, 0, BOMBA.w * ic, BOMBA.h * ic);
      PP.gfx.pixelArt(cv, { renk: 10, hat: '#0b0b0f' });
      cv._ic = ic;
      bombaOnbellek = cv;
    }
    return bombaOnbellek;
  }

  // Ayni serite birden fazla oyuncu girebiliyor; ust uste binmesinler diye
  // her oyuncu slotuna gore kucuk bir kaydirmayla cizilir.
  var KAYDIR = [-7, 7, -3, 3];

  PP.MG = PP.MG || {};
  PP.MG.collect = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you];
      var gec = v.gecikme || 0;

      g.doku(ctx, 0, 0, v.W, v.H, 'metal');
      // Yakalayinca yesil, bomba yiyince kirmizi parlama
      if (ben && ben.fl) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        g.rect(ctx, 0, 0, v.W, v.H, ben.fl === 1 ? '#7ed957' : '#e05a4a');
        ctx.restore();
      }

      var seritW = v.W / st.lanes;

      // ---- serit ayiricilari ----
      for (var l = 1; l < st.lanes; l++) {
        var lx = Math.round(seritW * l);
        for (var d = (Math.floor(v.time * 40) % 10); d < v.H - v.top; d += 10) {
          g.rect(ctx, lx, v.top + d, 1, 5, '#3b3872');
        }
      }

      // ---- yakalama cizgisi / zemin ----
      g.doku(ctx, 0, st.yak + 8, v.W, v.H - st.yak - 8, 'zemin');
      g.rect(ctx, 0, st.yak + 8, v.W, 1, '#6b64c0');

      // ---- dusen esyalar ----
      for (var i = 0; i < st.items.length; i++) {
        var it = st.items[i];
        // Paketler arasinda konumu hizla suzerek ilerlet -> akici dusus
        var iy = it.y + (it.v || 0) * gec;
        if (iy > v.H + 10) continue;
        var ix = Math.round(seritW * it.l + seritW / 2);

        if (it.b) {
          var bres = bombaHazir();
          if (bres) {
            ctx.drawImage(bres, Math.round(ix - BOMBA.w / 2), Math.round(iy - BOMBA.h / 2),
              BOMBA.w, BOMBA.h);
          } else {
            g.rect(ctx, ix - 7, Math.round(iy) - 6, 14, 12, P.dark);
          }
        } else {
          // Yildiz doner gibi hafif parlar
          var parla = Math.floor(v.time * 10 + i) % 2 === 0;
          g.sprite(ctx, YILDIZ, ix - 7, Math.round(iy) - 7, 2,
            { '#': parla ? '#fff45c' : P.yellow });
        }
      }

      // ---- oyuncular ----
      var n = v.players.length;
      for (var m = 0; m < n; m++) {
        var p = v.players[m];
        var me = st.pl[p.id];
        if (!me) continue;
        var kaydir = n > 1 ? KAYDIR[p.slot % KAYDIR.length] : 0;
        var px = Math.round(seritW * me.l + seritW / 2) + kaydir;
        var zipla = Math.round(Math.sin(v.time * 10 + m) * 1);
        var col = g.colorForSlot(p.slot);

        // Ayagin altinda slot renginde taban: kalabalikta kim kim belli olsun
        g.rect(ctx, px - 11, st.yak + 9, 22, 2, col);
        PP.chars.ciz(ctx, p.char, px, st.yak - 2 + zipla, 26, 22);

        if (p.id === v.you) {
          var ok = Math.round(Math.sin(v.time * 6) * 1);
          g.arrow(ctx, 'down', px - 4, st.yak - 22 + ok, 1, P.white);
        }
      }

      // ---- skorlar ----
      var slotW = v.W / n;
      for (var k = 0; k < n; k++) {
        var p2 = v.players[k];
        var pd = st.pl[p2.id];
        var skor = ' ' + (pd ? pd.s : 0);
        var isim = f.sigdir(p2.name, slotW - 4 - f.width(skor, 1), 1);
        f.text(ctx, isim + skor, Math.round(slotW * k + slotW / 2), v.top + 2, {
          color: g.colorForSlot(p2.slot), scale: 1, align: 'center', shadow: P.black
        });
      }

      f.text(ctx, t('ic.collect.uyari'), v.W / 2, v.H - 8, {
        color: P.red, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
