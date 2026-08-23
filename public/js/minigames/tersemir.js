/* TERS EMIR - ekran cizimi
 *
 * Tek isi var: emri OKUNAKLI ama sasirtici gostermek. Duz emir sakin
 * (beyaz yazi, lacivert zemin), ters emir bagirir (kirmizi yazi, kirmizi
 * cerceve, titreyen "TERS" seridi). Renk tek basina isaret degil - ters
 * emirde yazinin altina ters yonu gosteren bir ok da cizilir ki oyun
 * renk ayirt edemeyen biri icin de oynanabilir kalsin.
 */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var TERSI = { left: 'right', right: 'left', up: 'down', down: 'up' };

  PP.MG = PP.MG || {};
  PP.MG.tersemir = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you];
      var e = st.emir;
      var ters = !!(e && e.ters);

      // ---- zemin ----
      g.doku(ctx, 0, 0, v.W, v.H, 'metal');
      if (ters) {
        // Ters emirde ekran hafifce kirmizi atar: "dur, dusun" isareti
        var nabiz = 0.16 + 0.06 * Math.sin(v.time * 14);
        ctx.save();
        ctx.globalAlpha = nabiz;
        g.rect(ctx, 0, v.top, v.W, v.H - v.top, P.red);
        ctx.restore();
      }

      // Kendi cevabinin parlamasi (dogru yesil / yanlis kirmizi)
      if (ben && ben.fl) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        g.rect(ctx, 0, v.top, v.W, v.H - v.top, ben.fl === 1 ? P.green : P.red);
        ctx.restore();
      }

      // ---- emir tabelasi ----
      var tx = 46, tw = v.W - 92, ty = 52, th = 54;
      g.tabela(ctx, tx, ty, tw, th);
      if (ters) {
        // Kirmizi cerceve: tabelanin kendi hattinin uzerine
        var kal = Math.floor(v.time * 8) % 2 === 0 ? P.red : '#ff8a8a';
        g.rect(ctx, tx, ty, tw, 1, kal);
        g.rect(ctx, tx, ty + th - 1, tw, 1, kal);
        g.rect(ctx, tx, ty, 1, th, kal);
        g.rect(ctx, tx + tw - 1, ty, 1, th, kal);
      }

      if (e) {
        var orta = Math.round(tx + tw / 2);

        // "TERS" seridi - yazinin ustunde, hafifce titrer
        if (ters) {
          var kay = Math.round(Math.sin(v.time * 18) * 1);
          f.text(ctx, 'TERS!', orta + kay, ty + 5, {
            color: P.red, scale: 1, align: 'center', shadow: P.black
          });
        }

        // Emrin kendisi
        f.text(ctx, e.ad, orta, ty + (ters ? 16 : 18), {
          color: ters ? '#ff6b6b' : P.white, scale: ters ? 2.6 : 3, align: 'center',
          shadow: P.black
        });

        // Ters emirde basilacak yonu ok olarak da goster: oyun yalnizca
        // renge dayanmasin (renk korlugu) ve kural her seferinde hatirlansin.
        if (ters) {
          var oy = ty + th - 14;
          g.arrow(ctx, TERSI[e.y], orta - 4, oy, 1, P.red);
        }

        // ---- cevap suresi cubugu ----
        var pct = st.pencere > 0 ? st.kalan / st.pencere : 0;
        var cRenk = pct > 0.4 ? P.green : (pct > 0.2 ? P.yellow : P.red);
        g.bar(ctx, tx + 6, ty + th + 4, tw - 12, 6, pct, cRenk);
      } else {
        // Emirler arasi bosluk: "hazir ol"
        var yanip = Math.floor(v.time * 6) % 2 === 0;
        f.text(ctx, 'HAZIR OL', Math.round(tx + tw / 2), ty + 22, {
          color: yanip ? P.yellow : P.gray, scale: 2, align: 'center', shadow: P.black
        });
      }

      // ---- kural hatirlatmasi ----
      f.text(ctx, 'KIRMIZI = TERSINE BAS', v.W / 2, v.H - 9, {
        color: ters ? P.red : P.gray, scale: 1, align: 'center', shadow: P.black
      });

      // ---- oyuncu satiri: isim + skor + bu emre verdigi cevap ----
      var n = v.players.length, slotW = v.W / n;
      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var pd = st.pl[p.id];
        if (!pd) continue;
        var cx = Math.round(slotW * i + slotW / 2);
        var col = g.colorForSlot(p.slot);

        var skor = ' ' + pd.s;
        var isim = f.sigdir(p.name, slotW - 4 - f.width(skor, 1), 1);
        f.text(ctx, isim + skor, cx, v.top + 2, {
          color: col, scale: 1, align: 'center', shadow: P.black
        });

        // Cevap isareti: bekleyen bos kutu, dogru yesil, yanlis kirmizi.
        // Kim basti kim bekliyor tek bakista gorunsun.
        var ix = cx - 3, iy = v.top + 12;
        if (pd.cv === 0) {
          g.frame(ctx, ix, iy, 6, 6, P.dark, P.gray);
        } else {
          g.frame(ctx, ix, iy, 6, 6, pd.cv === 1 ? P.green : P.red, P.black);
        }
      }

      // ---- kacinci emirdeyiz ----
      f.text(ctx, (Math.min(st.no + 1, st.adet)) + '/' + st.adet, v.W - 4, v.H - 9, {
        color: P.gray, scale: 1, align: 'right', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
