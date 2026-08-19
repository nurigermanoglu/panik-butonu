/* ENGELDEN KAC - ekran cizimi (her oyuncu kendi sahasinda, ayni engeller ve yildizlar) */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var STAR_SPRITE = [
    '..##..',
    '.####.',
    '######',
    '######',
    '.####.',
    '..##..'
  ];

  PP.MG = PP.MG || {};
  PP.MG.dodge = {
    draw: function (ctx, st, v) {
      g.rect(ctx, 0, 0, v.W, v.H, P.bg);

      var n = v.players.length;
      var colW = v.W / n;
      var nameY = v.top + 2;
      var ay = v.top + 12;
      var ah = Math.min(st.h, v.H - ay - 2);

      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var col = g.colorForSlot(p.slot);
        var me = st.pl[p.id] || { x: 0, a: true, s: 0 };
        var ax = Math.round(colW * i + (colW - st.w) / 2);

        f.text(ctx, p.name, Math.round(colW * i + colW / 2), nameY, {
          color: col, scale: 1, align: 'center'
        });

        // saha
        g.frame(ctx, ax - 1, ay - 1, st.w + 2, ah + 2, P.dark, P.black);
        for (var ly = 0; ly < ah; ly += 14) {
          g.rect(ctx, ax, ay + ly, st.w, 1, '#3d476b');
        }

        // toplanan yildiz sayaci (sahanin sol ustu)
        g.sprite(ctx, STAR_SPRITE, ax + 2, ay + 2, 1, { '#': P.yellow });
        f.text(ctx, String(me.s || 0), ax + 10, ay + 2, { color: P.yellow, scale: 1 });

        // yildizlar (bu oyuncu almadiysa gorunur)
        for (var s = 0; s < st.stars.length; s++) {
          var sd = st.stars[s];
          if (sd.by && sd.by.indexOf(p.id) >= 0) continue;
          var sy = ay + sd.y;
          if (sy + st.ss < ay || sy > ay + ah) continue;
          g.sprite(ctx, STAR_SPRITE, ax + sd.x, sy, 1, { '#': P.yellow });
        }

        // engeller
        for (var k = 0; k < st.obs.length; k++) {
          var o = st.obs[k];
          var oy = ay + o.y;
          if (oy + st.oh < ay || oy > ay + ah) continue;
          var top = Math.max(ay, oy);
          var bot = Math.min(ay + ah, oy + st.oh);
          if (bot <= top) continue;
          g.rect(ctx, ax + o.x, top, o.w, bot - top, P.red);
          if (oy >= ay) g.rect(ctx, ax + o.x, oy, o.w, 1, P.purple);
        }

        // oyuncu
        var py = ay + st.py - 1;
        PP.chars.ciz(ctx, p.char, ax + me.x + st.pw / 2, py + st.ph / 2, 18, 15, { dead: !me.a });
        if (!me.a) {
          f.text(ctx, 'BITTI', ax + st.w / 2, py - 12, {
            color: P.white, scale: 1, align: 'center', shadow: P.black
          });
        }

        if (i > 0) g.rect(ctx, Math.round(colW * i) - 1, v.top, 1, v.H - v.top, P.dark);
      }
    }
  };
})(window.PP = window.PP || {});
