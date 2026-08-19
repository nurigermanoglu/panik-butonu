/* ENGELDEN KAC (Subway Surfers tarzi) - 3 seritli kosu pisti */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var ZEMIN = '#3a3550';
  var ZEMIN_ACIK = '#494263';
  var CIZGI = '#6b6390';
  var KENAR = '#8d84b8';
  var ENGEL = '#b13e53';
  var ENGEL_UST = '#e0687f';
  var ALCAK = '#c9743a';
  var ALCAK_UST = '#e8a05e';


  PP.MG = PP.MG || {};
  PP.MG.dodge = {
    draw: function (ctx, st, v) {
      g.rect(ctx, 0, 0, v.W, v.H, P.bg);

      var n = v.players.length;
      var colW = v.W / n;
      var nameY = v.top + 2;
      var ay = v.top + 12;
      var ah = Math.min(st.h, v.H - ay - 2);
      var seritW = st.w / st.lanes;

      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var col = g.colorForSlot(p.slot);
        var me = st.pl[p.id] || { k: 1, a: true, z: -1 };
        var ax = Math.round(colW * i + (colW - st.w) / 2);

        f.text(ctx, p.name, Math.round(colW * i + colW / 2), nameY, {
          color: col, scale: 1, align: 'center'
        });

        // ---- pist ----
        g.rect(ctx, ax - 1, ay - 1, st.w + 2, ah + 2, P.black);
        g.rect(ctx, ax, ay, st.w, ah, ZEMIN);
        // serit ayirici cizgiler (kesikli, akiyormus gibi)
        for (var l = 1; l < st.lanes; l++) {
          var lx = ax + Math.round(seritW * l);
          for (var d = (Math.floor(v.time * 60) % 12); d < ah; d += 12) {
            g.rect(ctx, lx, ay + d, 1, 6, CIZGI);
          }
        }
        // kenar bantlari
        g.rect(ctx, ax, ay, 2, ah, KENAR);
        g.rect(ctx, ax + st.w - 2, ay, 2, ah, KENAR);
        // uzaklik hissi: ust taraf biraz daha koyu
        g.rect(ctx, ax + 2, ay, st.w - 4, 10, '#2f2b44');

        // ---- engel satirlari ----
        for (var r = 0; r < st.rows.length; r++) {
          var row = st.rows[r];
          var ry = ay + row.y;
          if (ry + st.rh < ay || ry > ay + ah) continue;
          var ust = Math.max(ay, ry);
          var alt = Math.min(ay + ah, ry + st.rh);
          if (alt <= ust) continue;

          for (var q = 0; q < row.k.length; q++) {
            var ex = ax + Math.round(seritW * row.k[q]) + 1;
            var ew = Math.round(seritW) - 2;
            if (row.al) {
              // ALCAK engel: kisa, ustunden ziplanabilir
              var ay2 = Math.max(ust, ry + Math.round(st.rh * 0.45));
              if (alt > ay2) {
                g.rect(ctx, ex, ay2, ew, alt - ay2, ALCAK);
                if (ry + st.rh * 0.45 >= ay) g.rect(ctx, ex, ay2, ew, 2, ALCAK_UST);
              }
            } else {
              g.rect(ctx, ex, ust, ew, alt - ust, ENGEL);
              if (ry >= ay) g.rect(ctx, ex, ry, ew, 2, ENGEL_UST);
              // dikey cubuklar - duvar hissi
              for (var cc = 4; cc < ew - 2; cc += 6) {
                g.rect(ctx, ex + cc, ust, 1, alt - ust, '#8d2f42');
              }
            }
          }
        }

        // ---- oyuncu ----
        var px = ax + Math.round(st.w * (me.k + 0.5) / st.lanes);
        var zipla = 0;
        if (me.z >= 0) zipla = Math.round(Math.sin(Math.PI * me.z) * 16);   // ziplama yayi
        var py = ay + st.py - zipla;

        if (me.a && zipla > 2) {                                  // havadayken golge
          g.rect(ctx, px - 5, ay + st.py + st.ph - 1, 10, 2, '#2a2640');
        }
        PP.chars.ciz(ctx, p.char, px, py + st.ph / 2, st.pw + 6, st.ph + 2, { dead: !me.a });

        if (!me.a) {
          f.text(ctx, 'BITTI', ax + st.w / 2, ay + st.py - 14, {
            color: P.white, scale: 1, align: 'center', shadow: P.black
          });
        }

        if (i > 0) g.rect(ctx, Math.round(colW * i) - 1, v.top, 1, v.H - v.top, P.dark);
      }

      f.text(ctx, 'SOL/SAG = SERIT   YUKARI = ZIPLA', v.W / 2, v.H - 8, {
        color: P.light, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
