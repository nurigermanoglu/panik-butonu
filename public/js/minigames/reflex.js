/* REFLEKS DUELLOSU - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;
  // Ekrandaki her yazi dil dosyasindan gelir (bkz. js/dil.js)
  var t = function () { return PP.dil.t.apply(PP.dil, arguments); };

  PP.MG = PP.MG || {};
  PP.MG.reflex = {
    draw: function (ctx, st, v) {
      var benYandim = st.fouled[v.you] === true;
      var benBastim = st.r && st.r[v.you] !== null && st.r[v.you] !== undefined;

      // ---- arka plan ve orta mesaj ----
      if (benYandim) {
        // Yanan oyuncuya "BAS!" demek yaniltici olur: net biçimde durumunu goster.
        g.rect(ctx, 0, 0, v.W, v.H, P.dark);
        f.text(ctx, t('ic.reflex.erken'), v.W / 2, v.top + 18, {
          color: P.red, scale: 3, align: 'center', shadow: P.black
        });
        f.text(ctx, t('ic.reflex.yandin'), v.W / 2, v.top + 46, {
          color: P.white, scale: 2, align: 'center'
        });
        f.text(ctx, t(st.sig ? 'ic.reflex.izle' : 'ic.reflex.isaretBekle'), v.W / 2, v.top + 70, {
          color: P.gray, scale: 1, align: 'center'
        });
      } else if (st.sig) {
        var flash = Math.floor(v.time * 12) % 2 === 0;
        g.rect(ctx, 0, 0, v.W, v.H, flash ? P.white : P.green);
        if (benBastim) {
          f.text(ctx, st.r[v.you] + ' MS', v.W / 2, v.top + 24, {
            color: P.black, scale: 4, align: 'center'
          });
          f.text(ctx, t('ic.reflex.rakibiBekle'), v.W / 2, v.top + 62, {
            color: P.black, scale: 1, align: 'center'
          });
        } else {
          f.text(ctx, t('ic.reflex.bas'), v.W / 2, v.top + 22, { color: P.black, scale: 5, align: 'center' });
        }
      } else {
        g.rect(ctx, 0, 0, v.W, v.H, P.red);
        f.text(ctx, t('ic.reflex.bekle'), v.W / 2, v.top + 26, { color: P.black, scale: 4, align: 'center' });
        var dots = '.'.repeat(1 + Math.floor(v.time * 3) % 3);
        f.text(ctx, dots, v.W / 2, v.top + 58, { color: P.black, scale: 2, align: 'center' });
        f.text(ctx, t('ic.reflex.erkenYanar'), v.W / 2, v.top + 76, {
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
        if (yandi) { label = t('ic.reflex.yandi'); lc = P.red; }
        else if (ms !== null && ms !== undefined) { label = t('ic.reflex.ms', { n: ms }); lc = koyuZemin ? P.green : P.black; }
        else { label = f.sigdir(p.name, slotW - 4, 1); lc = koyuZemin ? P.light : P.black; }

        f.text(ctx, label, cx, v.H - 14, {
          color: lc, scale: 1, align: 'center',
          shadow: koyuZemin || yandi ? P.black : null
        });
      }
    }
  };
})(window.PP = window.PP || {});
