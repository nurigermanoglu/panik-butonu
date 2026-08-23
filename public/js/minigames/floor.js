/* ZEMIN COKUYOR - ekran cizimi (herkes ayni izgarada) */
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

  // Ayni kareye birden fazla oyuncu girebiliyor; ust uste binmesinler diye
  // her oyuncu kendi slotuna gore kucuk bir kaydirmayla cizilir.
  var KAYDIR = [[-5, -3], [5, -3], [-5, 3], [5, 3]];

  PP.MG = PP.MG || {};
  PP.MG.floor = {
    draw: function (ctx, st, v) {
      g.doku(ctx, 0, 0, v.W, v.H, 'metal');

      var n = v.players.length;
      var altSerit = 12;                       // en altta durum yazisi icin pay
      var enFazla = v.H - v.top - 4 - altSerit;
      var hucre = Math.floor(enFazla / st.n);
      var izgaraW = hucre * st.n;
      var ax = Math.round((v.W - izgaraW) / 2);
      var ay = v.top + 3;

      var yanik = Math.floor(v.time * 8) % 2 === 0;

      // ---- izgara ----
      for (var h = 0; h < st.n * st.n; h++) {
        var hx = ax + (h % st.n) * hucre;
        var hy = ay + Math.floor(h / st.n) * hucre;
        var durum = st.hucre[h];

        if (durum === 2) {
          g.rect(ctx, hx, hy, hucre, hucre, BOSLUK);      // cokmus: karanlik bosluk
          continue;
        }
        var ana = TAS, ust = TAS_UST, alt = TAS_ALT;
        if (durum === 1) {
          ana = yanik ? UYARI_A : UYARI_B;
          ust = yanik ? '#ffd08a' : '#e0705c';
          alt = yanik ? '#a8642a' : '#7d2b20';
        }
        g.rect(ctx, hx, hy, hucre, hucre, '#000000');          // derz
        g.rect(ctx, hx, hy, hucre - 1, hucre - 1, ana);
        g.rect(ctx, hx, hy, hucre - 1, 2, ust);                // ust isik
        g.rect(ctx, hx, hy + hucre - 3, hucre - 1, 2, alt);    // alt golge
      }

      // ---- oyuncular (hepsi ayni izgarada) ----
      // Ayakta kalanlar once cizilir, dusenler ustte kalmasin diye.
      for (var i = 0; i < n; i++) {
        var p = v.players[i];
        var me = st.pl[p.id];
        if (!me || !me.a) continue;

        var k = KAYDIR[p.slot % KAYDIR.length];
        var kaydirX = n > 1 ? k[0] * (hucre / 30) : 0;
        var kaydirY = n > 1 ? k[1] * (hucre / 30) : 0;
        var px = ax + (me.h % st.n) * hucre + hucre / 2 + kaydirX;
        var py = ay + Math.floor(me.h / st.n) * hucre + hucre / 2 + kaydirY;
        var zipla = Math.round(Math.sin(v.time * 9 + i) * 1);
        var boy = Math.max(10, Math.round(hucre * 0.62));

        // Kendi karakterini bulmak kolay olsun: altinda renkli bir taban
        var col = g.colorForSlot(p.slot);
        g.rect(ctx, Math.round(px - boy / 2), Math.round(py + boy / 2 - 1),
          boy, 2, col);
        PP.chars.ciz(ctx, p.char, px, py + zipla, boy + 3, boy);

        if (p.id === v.you) {
          // Kalabalikta kendini kaybetme: basinin ustunde kucuk ok
          g.arrow(ctx, 'down', Math.round(px - 4),
            Math.round(py - boy / 2 - 8 + Math.sin(v.time * 6) * 1), 1, P.white);
        }
      }

      // ---- kenar seritleri: kim ayakta, kim dustu ----
      // Izgara ortada oldugu icin iki yanda bos serit kaliyor; oyuncu listesi
      // oraya yazilir. Boylece izgaranin kendisi olabildigince buyuk kalir.
      var seritW = ax - 6;
      for (var m = 0; m < n; m++) {
        var pl2 = v.players[m];
        var d2 = st.pl[pl2.id];
        var solda = m % 2 === 0;
        var sx = solda ? 4 : ax + izgaraW + 4;
        var sy = v.top + 6 + Math.floor(m / 2) * 14;
        var yasiyor = !d2 || d2.a;
        f.text(ctx, f.sigdir(pl2.name, seritW - 2, 1), sx, sy, {
          color: yasiyor ? g.colorForSlot(pl2.slot) : P.gray,
          scale: 1, shadow: P.black
        });
        if (!yasiyor) {
          f.text(ctx, 'DUSTU', sx, sy + 7, { color: P.red, scale: 1, shadow: P.black });
        }
      }

      f.text(ctx, 'YON TUSLARI = KAC', v.W / 2, v.H - 8, {
        color: P.light, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
