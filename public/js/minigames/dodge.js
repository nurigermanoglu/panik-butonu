/* ENGELDEN KAC (Subway Surfers tarzi) - 3 seritli kosu, ziplama yok */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var ZEMIN = '#6b4d31';
  var CIZGI = '#8a6a45';
  var KENAR = '#4a7a3a';

  // Engel cesitleri - ciftlik yolunda karsina cikacak seyler
  var TIPLER = [
    { ana: '#a8533f', ust: '#c9705a', koyu: '#71321f' },   // tugla duvar
    { ana: '#8a5a34', ust: '#b07a45', koyu: '#5a3a22' },   // tahta sandik
    { ana: '#7d7566', ust: '#a49a88', koyu: '#544e44' }    // tas bariyer
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
      var seritW = st.w / st.lanes;
      var gec = v.gecikme || 0;      // son paketten bu yana gecen sure

      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var col = g.colorForSlot(p.slot);
        var me = st.pl[p.id] || { k: 1, a: true };
        var ax = Math.round(colW * i + (colW - st.w) / 2);

        f.text(ctx, p.name, Math.round(colW * i + colW / 2), nameY, {
          color: col, scale: 1, align: 'center'
        });

        // ---- pist ----
        g.rect(ctx, ax - 1, ay - 1, st.w + 2, ah + 2, P.black);
        g.rect(ctx, ax, ay, st.w, ah, ZEMIN);
        // serit ayirici cizgiler (akiyormus gibi)
        for (var l = 1; l < st.lanes; l++) {
          var lx = ax + Math.round(seritW * l);
          for (var d = (Math.floor(v.time * 60) % 12); d < ah; d += 12) {
            g.rect(ctx, lx, ay + d, 1, 6, CIZGI);
          }
        }
        g.rect(ctx, ax, ay, 2, ah, KENAR);
        g.rect(ctx, ax + st.w - 2, ay, 2, ah, KENAR);
        g.rect(ctx, ax + 2, ay, st.w - 4, 10, '#4a341f');     // uzaklik hissi

        // ---- engel satirlari ----
        for (var r = 0; r < st.rows.length; r++) {
          var row = st.rows[r];
          // Paketler arasinda konumu hizla suzerek ilerlet -> 60 fps akici hareket
          var ry = ay + row.y + (row.v || 0) * gec;
          var rh = row.h || st.rh;
          if (ry + rh < ay || ry > ay + ah) continue;
          var ust = Math.max(ay, ry);
          var alt = Math.min(ay + ah, ry + rh);
          if (alt <= ust) continue;

          for (var q = 0; q < row.k.length; q++) {
            var ex = ax + Math.round(seritW * row.k[q]) + 1;
            var ew = Math.round(seritW) - 2;

            var T = TIPLER[(row.tip || 0) % TIPLER.length];
            g.rect(ctx, ex, ust, ew, alt - ust, T.ana);
            if (ry >= ay) g.rect(ctx, ex, ry, ew, 2, T.ust);
            g.rect(ctx, ex, alt - 1, ew, 1, T.koyu);

            if ((row.tip || 0) === 0) {                          // duvar: dikey cubuklar
              for (var c1 = 4; c1 < ew - 2; c1 += 6) {
                g.rect(ctx, ex + c1, ust, 1, alt - ust, T.koyu);
              }
            } else if ((row.tip || 0) === 1) {                   // blok: kutucuklar
              var ortaY = Math.round((ust + alt) / 2);
              if (ortaY > ust && ortaY < alt) g.rect(ctx, ex, ortaY, ew, 1, T.koyu);
              g.rect(ctx, ex + Math.round(ew / 2), ust, 1, alt - ust, T.koyu);
            } else {                                             // bariyer: capraz cizgiler
              for (var c2 = 0; c2 < ew; c2 += 5) {
                g.rect(ctx, ex + c2, ust, 2, Math.max(1, Math.round((alt - ust) / 2)), T.koyu);
              }
            }
          }
        }

        // ---- oyuncu ----
        // Engeller gibi oyuncu da paketler arasinda suzulerek ilerletilir.
        // Sunucu hedef seridi (h) ve gecis hizini (sw) yolluyor; burada AYNI
        // suzulme tekrar edilir. Yoksa karakter paket basina bir zipliyor ve
        // en cok bakilan sey oldugu icin butun oyun kasiyormus gibi gorunuyor.
        var k = me.k;
        if (me.h !== undefined && st.sw) {
          var fark = me.h - k, adim = st.sw * gec;
          k = Math.abs(fark) <= adim ? me.h : k + (fark > 0 ? adim : -adim);
        }
        // Ekran pikseline degil, IC cozunurluk pikseline oturt: 3x olcekte
        // uc kat daha ince konum -> gozle gorulur sekilde daha akici.
        var ic = (PP.res && PP.res.olcek) || 1;
        var px = ax + Math.round(st.w * (k + 0.5) / st.lanes * ic) / ic;
        var py = ay + st.py;
        PP.chars.ciz(ctx, p.char, px, py + st.ph / 2, st.pw + 6, st.ph + 2, { dead: !me.a });

        if (!me.a) {
          f.text(ctx, 'BITTI', ax + st.w / 2, ay + st.py - 14, {
            color: P.white, scale: 1, align: 'center', shadow: P.black
          });
        }

        if (i > 0) g.rect(ctx, Math.round(colW * i) - 1, v.top, 1, v.H - v.top, P.dark);
      }

      f.text(ctx, 'SOL / SAG = SERIT DEGISTIR', v.W / 2, v.H - 8, {
        color: P.light, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
