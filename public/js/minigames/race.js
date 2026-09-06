/* AT YARISI - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;
  // Ekrandaki her yazi dil dosyasindan gelir (bkz. js/dil.js)
  var t = function () { return PP.dil.t.apply(PP.dil, arguments); };

  var BASLA_X = 16;      // baslangic cizgisi
  var BITIS_X = 292;     // bitis cizgisi
  var PIST_UST = 34;

  var CIM = '#2c4a2e';
  var CIM_ACIK = '#3a5f3c';
  var PIST = '#8a6a48';
  var PIST_ACIK = '#a07f57';
  var CIT = '#d8d8e8';

  PP.MG = PP.MG || {};
  PP.MG.race = {
    draw: function (ctx, st, v) {
      var n = v.players.length;
      var avail = v.H - PIST_UST - 8;
      var laneH = avail / n;

      // gokyuzu / cim
      g.rect(ctx, 0, 0, v.W, v.H, CIM);
      for (var s = 0; s < v.W; s += 9) {
        g.rect(ctx, s, v.top + 2, 3, 2, CIM_ACIK);
        g.rect(ctx, s + 4, v.H - 5, 3, 2, CIM_ACIK);
      }

      // ---- kulvarlar ----
      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var pct = Math.max(0, Math.min(1, (st.p[p.id] || 0) / st.target));
        var col = g.colorForSlot(p.slot);
        var ly = Math.round(PIST_UST + laneH * i);
        var lh = Math.round(laneH) - 3;

        // pist zemini
        g.rect(ctx, 0, ly, v.W, lh, PIST);
        g.rect(ctx, 0, ly, v.W, 1, PIST_ACIK);
        for (var d = 0; d < v.W; d += 16) {                 // toprak dokusu
          g.rect(ctx, d + (i % 2) * 8, ly + Math.round(lh * 0.6), 5, 1, PIST_ACIK);
        }
        // kulvar citi (alt kenar)
        g.rect(ctx, 0, ly + lh, v.W, 2, CIT);
        for (var c = 0; c < v.W; c += 20) g.rect(ctx, c, ly + lh - 2, 2, 4, CIT);

        // baslangic cizgisi
        g.rect(ctx, BASLA_X - 3, ly + 2, 1, lh - 4, P.white);

        // bitis cizgisi (dama)
        for (var r = 0; r < lh - 3; r += 4) {
          for (var q = 0; q < 2; q++) {
            var kare = ((r / 4) + q) % 2 === 0 ? P.white : P.black;
            g.rect(ctx, BITIS_X + q * 4, ly + 2 + r, 4, 4, kare);
          }
        }

        // kulvar numarasi
        f.text(ctx, String(i + 1), 4, ly + Math.round(lh / 2) - 3, {
          color: PIST_ACIK, scale: 1
        });

        // ---- kosan karakter ----
        var kx = Math.round(BASLA_X + pct * (BITIS_X - BASLA_X));
        var ky = ly + Math.round(lh / 2);
        var kosuyor = pct < 1;
        var zipla = kosuyor ? Math.round(Math.abs(Math.sin(v.time * 16 + i)) * -3) : 0;

        // toz bulutu
        if (kosuyor && pct > 0.01) {
          for (var t = 1; t <= 3; t++) {
            var tx = kx - t * 6 - Math.round(Math.sin(v.time * 12 + t) * 2);
            g.rect(ctx, tx, ky + 5 - t, 3 - (t > 2 ? 1 : 0), 2, PIST_ACIK);
          }
        }

        var boy = Math.min(26, lh - 6);
        PP.chars.ciz(ctx, p.char, kx, ky + zipla, boy + 6, boy);

        // isim ve yuzde
        f.text(ctx, p.name, BASLA_X + 6, ly + 2, { color: col, scale: 1, shadow: P.black });
        // Bitis etiketi: kulvarin sag ucunda TEK yazi.
        // Onceden yuzde hep cizilir, bitirene ayrica karakterin ustune
        // "BITTI!" yazilirdi. Bitiste karakter zaten bitis cizgisinde
        // oldugu icin iki yazi ust uste biniyor ve "100BITTI" gibi
        // okunuyordu. Bitiren icin yuzde zaten %100; onun yerine
        // dogrudan BITTI yaziliyor.
        if (pct >= 1) {
          f.text(ctx, t('ic.race.bitti'), BITIS_X - 4, ly + 2, {
            color: P.yellow, scale: 1, align: 'right', shadow: P.black
          });
        } else {
          f.text(ctx, Math.round(pct * 100) + '%', BITIS_X - 4, ly + 2, {
            color: P.white, scale: 1, align: 'right', shadow: P.black
          });
        }
      }

      // bitis diregi ve bayrak
      g.rect(ctx, BITIS_X + 8, PIST_UST - 12, 2, v.H - PIST_UST - 6, P.gray);
      g.rect(ctx, BITIS_X - 6, PIST_UST - 14, 16, 8, P.white);
      for (var b = 0; b < 4; b++) {
        for (var b2 = 0; b2 < 2; b2++) {
          if ((b + b2) % 2) g.rect(ctx, BITIS_X - 6 + b * 4, PIST_UST - 14 + b2 * 4, 4, 4, P.black);
        }
      }

      f.text(ctx, t('ic.race.ipucu'), v.W / 2, v.top + 2, {
        color: P.yellow, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
