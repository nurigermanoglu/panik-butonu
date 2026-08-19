/* BUTON YAGMURU - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  PP.MG = PP.MG || {};
  PP.MG.mash = {
    draw: function (ctx, st, v) {
      g.rect(ctx, 0, 0, v.W, v.H, P.bg);

      var n = v.players.length;
      var top = v.top + 6;
      var avail = v.H - top - 8;
      var rowH = avail / n;

      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var col = g.colorForSlot(p.slot);
        var pct = (st.p[p.id] || 0) / st.target;
        var cy = Math.round(top + rowH * i + rowH / 2);

        f.text(ctx, p.name, 5, cy - 16, { color: col, scale: 1 });

        var tx = 5, tw = v.W - 10, ty = cy - 5, th = 16;
        g.frame(ctx, tx, ty, tw, th, P.dark, P.black);

        // bitis cizgisi (dama deseni)
        for (var k = 0; k < 4; k++) {
          for (var j = 0; j < 2; j++) {
            var cc = (k + j) % 2 === 0 ? P.white : P.gray;
            g.rect(ctx, tx + tw - 8 + j * 4, ty + 2 + k * 3, 4, 3, cc);
          }
        }

        // dolan kisim
        var fillW = Math.round((tw - 14) * Math.max(0, Math.min(1, pct)));
        if (fillW > 0) g.rect(ctx, tx + 2, ty + 2, fillW, th - 4, col);

        // kosan karakter
        var bx = tx + 1 + Math.round((tw - 16) * Math.max(0, Math.min(1, pct)));
        var bob = pct >= 1 ? 0 : Math.round(Math.sin(v.time * 22 + i) * 1.5);
        PP.chars.ciz(ctx, p.char, bx + 7, cy + bob, 18, 15);

        var pctTxt = Math.round(pct * 100) + '%';
        f.text(ctx, pctTxt, v.W - 5, cy - 16, { color: P.light, scale: 1, align: 'right' });
      }

      f.text(ctx, 'HIZLI BAS!', v.W / 2, v.H - 9, {
        color: P.yellow, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
