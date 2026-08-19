/* REFLEKS DUELLOSU - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  PP.MG = PP.MG || {};
  PP.MG.reflex = {
    draw: function (ctx, st, v) {
      var benYandim = st.fouled[v.you] === true;
      var benBastim = st.r && st.r[v.you] !== null && st.r[v.you] !== undefined;

      // ---- arka plan ve orta mesaj ----
      if (benYandim) {
        // Yanan oyuncuya "BAS!" demek yaniltici olur: net biçimde durumunu goster.
        g.rect(ctx, 0, 0, v.W, v.H, P.dark);
        f.text(ctx, 'ERKEN BASTIN!', v.W / 2, v.top + 18, {
          color: P.red, scale: 3, align: 'center', shadow: P.black
        });
        f.text(ctx, 'BU TUR YANDIN', v.W / 2, v.top + 46, {
          color: P.white, scale: 2, align: 'center'
        });
        f.text(ctx, st.sig ? 'RAKIBINI IZLE...' : 'ISARETI BEKLIYOR...', v.W / 2, v.top + 70, {
          color: P.gray, scale: 1, align: 'center'
        });
      } else if (st.sig) {
        var flash = Math.floor(v.time * 12) % 2 === 0;
        g.rect(ctx, 0, 0, v.W, v.H, flash ? P.white : P.green);
        if (benBastim) {
          f.text(ctx, st.r[v.you] + ' MS', v.W / 2, v.top + 24, {
            color: P.black, scale: 4, align: 'center'
          });
          f.text(ctx, 'RAKIBI BEKLE', v.W / 2, v.top + 62, {
            color: P.black, scale: 1, align: 'center'
          });
        } else {
          f.text(ctx, 'BAS!', v.W / 2, v.top + 22, { color: P.black, scale: 5, align: 'center' });
        }
      } else {
        g.rect(ctx, 0, 0, v.W, v.H, P.red);
        f.text(ctx, 'BEKLE', v.W / 2, v.top + 26, { color: P.black, scale: 4, align: 'center' });
        var dots = '.'.repeat(1 + Math.floor(v.time * 3) % 3);
        f.text(ctx, dots, v.W / 2, v.top + 58, { color: P.black, scale: 2, align: 'center' });
        f.text(ctx, 'ERKEN BASAN YANAR!', v.W / 2, v.top + 76, {
          color: P.black, scale: 1, align: 'center'
        });
      }

      // ---- altta oyuncu durumlari ----
      var koyuZemin = benYandim;                 // zemin koyuysa yazilar acik renk olmali
      var n = v.players.length;
      var slotW = v.W / n;
      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var cx = Math.round(slotW * i + slotW / 2);
        var col = g.colorForSlot(p.slot);
        var yandi = !!st.fouled[p.id];
        var ms = st.r ? st.r[p.id] : null;

        PP.chars.ciz(ctx, p.char, cx, v.H - 24, 24, 18, { dead: yandi });

        var label, lc;
        if (yandi) { label = 'YANDI!'; lc = P.red; }
        else if (ms !== null && ms !== undefined) { label = ms + ' MS'; lc = koyuZemin ? P.green : P.black; }
        else { label = p.name; lc = koyuZemin ? P.light : P.black; }

        f.text(ctx, label, cx, v.H - 14, {
          color: lc, scale: 1, align: 'center',
          shadow: koyuZemin || yandi ? P.black : null
        });
      }
    }
  };
})(window.PP = window.PP || {});
