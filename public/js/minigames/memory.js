/* HAFIZA DIZISI - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;
  // Ekrandaki her yazi dil dosyasindan gelir (bkz. js/dil.js)
  var t = function () { return PP.dil.t.apply(PP.dil, arguments); };

  PP.MG = PP.MG || {};
  PP.MG.memory = {
    draw: function (ctx, st, v) {
      g.rect(ctx, 0, 0, v.W, v.H, st.showing ? P.bg2 : P.bg);

      var cx = v.W / 2;

      if (st.showing) {
        f.text(ctx, t('ic.memory.ezberle'), cx, v.top + 4, { color: P.yellow, scale: 2, align: 'center' });
        if (st.cur) {
          var s = 6, size = g.arrowSize(s);
          g.arrow(ctx, st.cur, cx - size / 2, v.top + 30, s, P.white);
        }
      } else {
        f.text(ctx, t('ic.memory.siraSende'), cx, v.top + 4, { color: P.green, scale: 2, align: 'center' });

        var n = v.players.length;
        var colW = v.W / n;
        for (var i = 0; i < n; i++) {
          var p = v.players[i];
          var col = g.colorForSlot(p.slot);
          var px = colW * i + colW / 2;
          var out = !!st.out[p.id];
          var prog = st.prog[p.id] || 0;

          PP.chars.ciz(ctx, p.char, px, v.top + 36, 24, 18, { dead: out });
          f.text(ctx, f.sigdir(p.name, colW - 4, 1), px, v.top + 46,
            { color: out ? P.gray : col, scale: 1, align: 'center' });

          // ilerleme kutulari
          var boxW = 12, gap = 3;
          var totalW = st.n * boxW + (st.n - 1) * gap;
          var bx = px - totalW / 2;
          for (var k = 0; k < st.n; k++) {
            var filled = k < prog;
            var fill = out ? P.dark : filled ? col : P.dark;
            g.frame(ctx, bx + k * (boxW + gap), v.top + 58, boxW, 12, fill, P.black);
            if (filled && !out) g.rect(ctx, bx + k * (boxW + gap) + 4, v.top + 62, 4, 4, P.white);
          }

          if (out) {
            f.text(ctx, t('ic.memory.yanlis'), px, v.top + 76, { color: P.red, scale: 1, align: 'center' });
          }
        }

        f.text(ctx, t('ic.memory.yonTuslari'), cx, v.H - 10, { color: P.light, scale: 1, align: 'center' });
      }
    }
  };
})(window.PP = window.PP || {});
