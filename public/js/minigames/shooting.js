/* SISE VURMA - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var SISE = [
    '...##...',
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '########',
    '.######.',
    '..####..',
    '..####..'
  ];

  var BOMBA = [
    '..xx....',
    '.xx.....',
    '.####...',
    '######..',
    '######..',
    '######..',
    '.####...',
    '........'
  ];

  var ARTI = [
    '....#....',
    '....#....',
    '....#....',
    '.........',
    '##.....##',
    '.........',
    '....#....',
    '....#....',
    '....#....'
  ];

  PP.MG = PP.MG || {};
  PP.MG.shooting = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you] || { s: 0, hit: [], fl: 0 };

      // zemin: isabet yesil, bomba kirmizi parlar
      var zemin = ben.fl === 1 ? '#233524' : ben.fl === 2 ? '#3a2028' : P.bg;
      g.rect(ctx, 0, 0, v.W, v.H, zemin);

      // atis poligonu: ust ve alt cizgi
      g.rect(ctx, 0, st.top - 2, v.W, 1, P.dark);
      g.rect(ctx, 0, st.bot + 2, v.W, 1, P.dark);
      for (var s = 0; s < v.W; s += 24) {
        g.rect(ctx, s, st.bot + 4, 12, 2, '#2a2f45');
      }

      // ---- ucan hedefler ----
      for (var k = 0; k < st.act.length; k++) {
        var a = st.act[k];
        if (ben.hit.indexOf(a.i) >= 0) continue;      // bunu ben vurdum, benim ekranimda yok
        if (a.bomb) {
          g.sprite(ctx, BOMBA, a.x, a.y + 3, 2, { '#': P.red, 'x': P.orange });
        } else {
          g.sprite(ctx, SISE, a.x + 1, a.y, 1, { '#': P.teal });
          g.rect(ctx, a.x + 4, a.y + 5, 2, 6, P.light);   // parlama
        }
      }

      // ---- nisangah ----
      if (v.ptr) {
        var renk = v.ptr.down ? P.yellow : P.white;
        g.sprite(ctx, ARTI, v.ptr.x - 4, v.ptr.y - 4, 1, { '#': renk });
      }

      // ---- skorlar ----
      var n = v.players.length, slotW = v.W / n;
      for (var m = 0; m < n; m++) {
        var p = v.players[m];
        var pd = st.pl[p.id];
        f.text(ctx, p.name + ' ' + (pd ? pd.s : 0), Math.round(slotW * m + slotW / 2), v.top + 2, {
          color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
        });
      }

      f.text(ctx, 'KIRMIZIYA ATES ETME!', v.W / 2, v.H - 8, {
        color: P.red, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
