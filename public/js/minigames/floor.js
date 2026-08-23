/* ZEMIN COKUYOR - ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  // Kare tonlari: saglam tas, uyari (yanip sonen), cokmus bosluk
  var TAS_UST = '#6f6ab0';
  var TAS = '#4f4a8c';
  var TAS_ALT = '#332f60';
  var UYARI_A = '#f0a04a';
  var UYARI_B = '#c04a3a';
  var BOSLUK = '#0a0a12';

  PP.MG = PP.MG || {};
  PP.MG.floor = {
    draw: function (ctx, st, v) {
      g.doku(ctx, 0, 0, v.W, v.H, 'metal');

      var n = v.players.length;
      var colW = v.W / n;
      var izgaraUst = v.top + 12;
      var enFazlaYukseklik = v.H - izgaraUst - 12;

      // Hucre boyutu sahaya ve yukseklige gore: izgara her zaman kareye oturur
      var hucre = Math.floor(Math.min((colW - 8) / st.n, enFazlaYukseklik / st.n));
      if (hucre < 6) hucre = 6;
      var izgaraW = hucre * st.n;

      // Yanip sonme: uyaridaki kareler ayni tempoda calisin
      var yanik = Math.floor(v.time * 8) % 2 === 0;

      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var col = g.colorForSlot(p.slot);
        var me = st.pl[p.id] || { h: 0, a: true };
        var ax = Math.round(colW * i + (colW - izgaraW) / 2);
        var ay = izgaraUst;

        f.text(ctx, f.sigdir(p.name, colW - 4, 1),
          Math.round(colW * i + colW / 2), v.top + 2, {
            color: col, scale: 1, align: 'center', shadow: P.black
          });

        // ---- izgara ----
        for (var h = 0; h < st.n * st.n; h++) {
          var hx = ax + (h % st.n) * hucre;
          var hy = ay + Math.floor(h / st.n) * hucre;
          var durum = st.hucre[h];

          if (durum === 2) {
            // Cokmus: karanlik bosluk. Kenarlarda kalan kirik izleri.
            g.rect(ctx, hx, hy, hucre, hucre, BOSLUK);
            continue;
          }

          var ana = TAS, ust = TAS_UST, alt = TAS_ALT;
          if (durum === 1) {
            ana = yanik ? UYARI_A : UYARI_B;
            ust = yanik ? '#ffd08a' : '#e0705c';
            alt = yanik ? '#a8642a' : '#7d2b20';
          }
          g.rect(ctx, hx, hy, hucre, hucre, '#000000');           // derz
          g.rect(ctx, hx, hy, hucre - 1, hucre - 1, ana);
          g.rect(ctx, hx, hy, hucre - 1, 1, ust);                 // ust isik
          g.rect(ctx, hx, hy + hucre - 2, hucre - 1, 1, alt);     // alt golge
        }

        // ---- oyuncu ----
        var px = ax + (me.h % st.n) * hucre + hucre / 2;
        var py = ay + Math.floor(me.h / st.n) * hucre + hucre / 2;
        var zipla = me.a ? Math.round(Math.sin(v.time * 9 + i) * 1) : 0;
        var boy = Math.max(8, hucre - 3);
        PP.chars.ciz(ctx, p.char, px, py + zipla, boy + 3, boy, { dead: !me.a });

        if (!me.a) {
          f.text(ctx, 'DUSTU', Math.round(colW * i + colW / 2), ay + izgaraW + 2, {
            color: P.red, scale: 1, align: 'center', shadow: P.black
          });
        }

        if (i > 0) g.rect(ctx, Math.round(colW * i) - 1, v.top, 1, v.H - v.top, P.dark);
      }

      f.text(ctx, 'YON TUSLARI = KAC', v.W / 2, v.H - 8, {
        color: P.light, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
