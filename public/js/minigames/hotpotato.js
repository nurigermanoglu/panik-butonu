/* SICAK PATATES - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  // Bomba gorseli - Kostebek Avi'ndaki bombayla ayni resim
  var BOMBA = { src: 'img/bomba.png', kirp: { x: 62, y: 69, w: 483, h: 383 }, w: 34, h: 27 };
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
      PP.gfx.pixelArt(cv, { renk: 12, hat: '#0b0b0f' });   // fotograf -> pixel art
      cv._ic = ic;
      bombaOnbellek = cv;
    }
    return bombaOnbellek;
  }

  PP.MG = PP.MG || {};
  PP.MG.hotpotato = {
    draw: function (ctx, st, v) {
      var bendeMi = st.holder === v.you;
      var tehlike = st.fuseMax > 0 ? 1 - st.fuse / st.fuseMax : 0;

      // Fitil bittikce zemin kizarir; bomba bendeyse daha da belirgin
      var zemin = P.bg;
      if (st.boom) zemin = P.white;
      else if (bendeMi) zemin = tehlike > 0.7 ? (Math.floor(v.time * 14) % 2 ? P.red : '#8f3524') : '#3a1a20';
      g.rect(ctx, 0, 0, v.W, v.H, zemin);

      // ---- ust mesaj ----
      if (st.boom) {
        f.text(ctx, 'BUUM!', v.W / 2, v.top + 8, { color: P.red, scale: 5, align: 'center' });
      } else if (bendeMi) {
        f.text(ctx, 'BOMBA SENDE!', v.W / 2, v.top + 4, {
          color: P.yellow, scale: 3, align: 'center', shadow: P.black
        });
        f.text(ctx, st.canPass ? 'BAS VE KURTUL!' : 'BEKLE...', v.W / 2, v.top + 30, {
          color: st.canPass ? P.white : P.gray, scale: 2, align: 'center', shadow: P.black
        });
      } else {
        // Kimde oldugu net olsun: ismini yaz
        var tutanAd = '?', tutanRenk = P.light;
        for (var q = 0; q < v.players.length; q++) {
          if (v.players[q].id === st.holder) {
            tutanAd = v.players[q].name;
            tutanRenk = g.colorForSlot(v.players[q].slot);
          }
        }
        f.text(ctx, 'BOMBA:', v.W / 2, v.top + 4, {
          color: P.light, scale: 2, align: 'center', shadow: P.black
        });
        f.text(ctx, tutanAd, v.W / 2, v.top + 26, {
          color: tutanRenk, scale: 3, align: 'center', shadow: P.black
        });
      }

      // ---- fitil cubugu ----
      if (!st.boom && st.fuseMax > 0) {
        var bw = 200, bx = (v.W - bw) / 2, by = v.top + 56;
        var kalan = Math.max(0, Math.min(1, st.fuse / st.fuseMax));
        var renk = kalan > 0.5 ? P.green : kalan > 0.22 ? P.yellow : P.red;
        g.bar(ctx, bx, by, bw, 10, kalan, renk, P.dark, P.black);
      }

      // ---- oyuncular ----
      var n = v.players.length, slotW = v.W / n;
      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var col = g.colorForSlot(p.slot);
        var cx = Math.round(slotW * i + slotW / 2);
        var yasiyor = st.alive[p.id] !== false;
        var tutuyor = st.holder === p.id;
        var patladi = st.boom && st.boomWho === p.id;

        var zipla = tutuyor && !st.boom ? Math.round(Math.sin(v.time * 18) * 2) : 0;
        PP.chars.ciz(ctx, p.char, cx, v.H - 40 + zipla, 36, 28, { dead: !yasiyor });

        if (patladi) {
          g.sprite(ctx, PATLAMA, cx - 13, v.H - 66, 2, { '#': P.orange });
        } else if (tutuyor && yasiyor) {
          var bres = bombaHazir();
          var by = v.H - 74 + Math.round(Math.sin(v.time * 12) * 2);
          if (bres) ctx.drawImage(bres, Math.round(cx - BOMBA.w / 2), by, BOMBA.w, BOMBA.h);
          else g.rect(ctx, cx - 8, by + 6, 16, 14, P.dark);
          // bombanin kimde oldugunu gosteren zipzip ok
          var zip = Math.round(Math.sin(v.time * 9) * 2);
          g.arrow(ctx, 'down', cx - 4, v.H - 92 + zip, 1, P.yellow);
        }

        f.text(ctx, p.name, cx, v.H - 10, {
          color: yasiyor ? col : P.gray, scale: 1, align: 'center', shadow: P.black
        });
        if (!yasiyor) {
          f.text(ctx, 'ELENDI', cx, v.H - 62, {
            color: P.red, scale: 1, align: 'center', shadow: P.black
          });
        }
      }
    }
  };
})(window.PP = window.PP || {});
