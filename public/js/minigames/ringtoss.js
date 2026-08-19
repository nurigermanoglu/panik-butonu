/* HALKA GECIRME - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var BOTTLE = [
    '...###...',
    '...###...',
    '...###...',
    '...###...',
    '..#####..',
    '.#######.',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '#########',
    '.#######.',
    '..#####..',
    '..#####..'
  ];

  var RING = [
    '..######..',
    '.#......#.',
    '#........#',
    '#........#',
    '.#......#.',
    '..######..'
  ];

  var BOTTLE_W = 9, RING_W = 10, RING_H = 6;

  function drawRing(ctx, cx, cy, col) {
    g.sprite(ctx, RING, Math.round(cx - RING_W / 2), Math.round(cy - RING_H / 2), 1,
      { '#': col });
  }

  PP.MG = PP.MG || {};
  PP.MG.ringtoss = {
    draw: function (ctx, st, v) {
      g.rect(ctx, 0, 0, v.W, v.H, P.bg);

      // tezgah
      g.rect(ctx, 0, st.neck + 20, v.W, v.H - (st.neck + 20), '#241f2e');
      g.rect(ctx, 0, st.neck + 20, v.W, 2, P.dark);
      g.rect(ctx, 0, st.pileY - 12, v.W, 1, '#2f2a3d');

      var ben = st.pl[v.you];
      var benimRenk = P.yellow;
      for (var q = 0; q < v.players.length; q++) {
        if (v.players[q].id === v.you) benimRenk = g.colorForSlot(v.players[q].slot);
      }

      // ---- siseler ----
      for (var i = 0; i < st.bottles.length; i++) {
        var bx = st.bottles[i];
        g.sprite(ctx, BOTTLE, bx - Math.floor(BOTTLE_W / 2), st.neck - 6, 1,
          { '#': P.teal });
        // boyun hedefi (hafif isaret)
        g.rect(ctx, bx - 1, st.neck - 8, 2, 1, P.light);
      }

      // ---- takilmis halkalar (sisenin boynunda) ----
      if (ben) {
        for (var k = 0; k < ben.r.length; k++) {
          var r = ben.r[k];
          if (r.st !== 2 || r.b < 0) continue;
          drawRing(ctx, st.bottles[r.b], st.neck + 2 + r.k * 5, benimRenk);
        }

        // ---- yigindaki halkalar ----
        for (var m = 0; m < ben.r.length; m++) {
          var r2 = ben.r[m];
          if (r2.st !== 0) continue;
          drawRing(ctx, r2.x, r2.y, P.light);   // yigindakiler notr renk, takilanlar oyuncu rengi
        }

        // ---- elimdeki halka: YEREL parmak konumunda (gecikmesiz) ----
        if (ben.h >= 0) {
          var hx = v.ptr && v.ptr.down ? v.ptr.x : ben.r[ben.h].x;
          var hy = v.ptr && v.ptr.down ? v.ptr.y : ben.r[ben.h].y;
          // hedef cizgisi
          g.rect(ctx, hx, st.neck, 1, Math.max(0, hy - st.neck), '#3d476b');
          drawRing(ctx, hx, hy, P.white);
        }
      }

      // ---- skorlar ----
      var n = v.players.length, slotW = v.W / n;
      for (var j = 0; j < n; j++) {
        var p = v.players[j];
        var pd = st.pl[p.id];
        var cx = Math.round(slotW * j + slotW / 2);
        f.text(ctx, p.name + ' ' + (pd ? pd.s : 0), cx, v.top + 2, {
          color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
        });
      }

      if (ben && ben.h < 0) {
        f.text(ctx, 'HALKAYI SURUKLE', v.W / 2, v.H - 9, {
          color: P.light, scale: 1, align: 'center', shadow: P.black
        });
      }
    }
  };
})(window.PP = window.PP || {});
