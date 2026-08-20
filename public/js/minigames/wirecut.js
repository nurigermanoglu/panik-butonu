/* KABLO KESME - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var MAKAS = [
    '#.....#',
    '.#...#.',
    '..#.#..',
    '...#...',
    '..###..',
    '.#...#.',
    '.#...#.',
    '..###..'
  ];

  PP.MG = PP.MG || {};
  PP.MG.wirecut = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you] || { p: 0, pen: 0, cut: [] };
      var sikisik = ben.pen > 0;

      g.rect(ctx, 0, 0, v.W, v.H, sikisik ? '#4a2418' : '#2a1c12');

      // ---- ust panel: kesim sirasi ----
      f.text(ctx, 'SIRA:', 6, v.top + 3, { color: P.light, scale: 1 });
      for (var i = 0; i < st.order.length; i++) {
        var bx = 44 + i * 22;
        var yapildi = i < ben.p;
        var siradaki = i === ben.p;
        g.frame(ctx, bx, v.top + 1, 16, 11, yapildi ? st.order[i] : P.dark,
          siradaki ? P.white : P.black);
        if (!yapildi) g.rect(ctx, bx + 3, v.top + 4, 10, 5, st.order[i]);
        if (yapildi) g.rect(ctx, bx + 6, v.top + 4, 4, 5, P.black);
        if (siradaki) {
          f.text(ctx, String(i + 1), bx + 8, v.top + 14, {
            color: P.white, scale: 1, align: 'center'
          });
        }
      }

      // ---- kablolar ----
      for (var k = 0; k < st.wires.length; k++) {
        var w = st.wires[k];
        var kesildi = ben.cut.indexOf(k) >= 0;
        var siradakiKablo = st.order[ben.p] === w.col && !kesildi;

        // tutucu plakalar
        g.rect(ctx, w.x - 12, st.top - 7, 24, 7, P.gray);
        g.rect(ctx, w.x - 12, st.bot, 24, 7, P.gray);

        if (!kesildi) {
          g.rect(ctx, w.x - 5, st.top, 10, st.bot - st.top, w.col);
          g.rect(ctx, w.x - 5, st.top, 3, st.bot - st.top, P.white);   // parlama
          g.rect(ctx, w.x + 4, st.top, 1, st.bot - st.top, P.black);   // golge kenar
        } else {
          // kopmus: ustten ve alttan sarkan iki parca
          var orta = (st.top + st.bot) / 2;
          g.rect(ctx, w.x - 5, st.top, 10, orta - st.top - 16, w.col);
          g.rect(ctx, w.x - 5, orta + 16, 10, st.bot - orta - 16, w.col);
          g.rect(ctx, w.x - 9, orta - 19, 9, 5, w.col);
          g.rect(ctx, w.x + 1, orta + 14, 9, 5, w.col);
          g.rect(ctx, w.x - 7, orta - 2, 14, 3, P.dark);               // kivilcim izi
        }

        // siradaki kabloyu belli et
        if (siradakiKablo && !sikisik && Math.floor(v.time * 4) % 2 === 0) {
          g.rect(ctx, w.x - st.band, st.top - 8, st.band * 2, 2, P.white);
        }
      }

      // ---- makas / uyari ----
      if (sikisik) {
        f.text(ctx, 'MAKAS SIKISTI!', v.W / 2, v.H / 2 - 10, {
          color: P.red, scale: 3, align: 'center', shadow: P.black
        });
        f.text(ctx, ben.pen.toFixed(1) + ' SN', v.W / 2, v.H / 2 + 16, {
          color: P.white, scale: 2, align: 'center', shadow: P.black
        });
      } else if (v.ptr) {
        g.sprite(ctx, MAKAS, v.ptr.x - 3, v.ptr.y - 4, 2, { '#': v.ptr.down ? P.yellow : P.light });
      }

      // ---- ilerleme ----
      var n = v.players.length, slotW = v.W / n;
      for (var m = 0; m < n; m++) {
        var p = v.players[m];
        var pd = st.pl[p.id];
        f.text(ctx, p.name + ' ' + (pd ? pd.p : 0) + '/' + st.n,
          Math.round(slotW * m + slotW / 2), v.H - 9, {
            color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
          });
      }
    }
  };
})(window.PP = window.PP || {});
