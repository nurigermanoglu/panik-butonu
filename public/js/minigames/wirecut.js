/* KABLO KESME - ekran cizimi (once ezberleme, sonra kesme) */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  var MAKAS = [
    '#.....#',
    '.#...#.',
    '..#.#..',
    '...#...',
    '..###..',
    '.#...#.',
    '.#...#.',
    '..###..'
  ];

  // ---- 1. asama: renk sirasi gosteriliyor ----
  // Kablolar HENUZ CIZILMEZ; ekranda tek bir buyuk renk kutusu olur.
  function ezberEkrani(ctx, st, v) {
    f.text(ctx, 'EZBERLE', v.W / 2, v.top + 6, {
      color: P.yellow, scale: 2, align: 'center', shadow: P.black
    });

    var bw = 92, bh = 62, bx = Math.round((v.W - bw) / 2), by = v.top + 34;
    if (st.cur) {
      // Kablonun kendisiyle ayni dil: renk + sol kenarda parlama, sag kenarda golge
      g.rect(ctx, bx - 3, by - 3, bw + 6, bh + 6, P.black);
      g.rect(ctx, bx, by, bw, bh, st.cur);
      g.rect(ctx, bx, by, 10, bh, P.white);
      g.rect(ctx, bx + bw - 4, by, 4, bh, 'rgba(0,0,0,0.35)');
    } else {
      // Renkler arasi bosluk: kutu bos durur ki iki ayni renk ust uste
      // gelince bile "iki ayri sinyal" oldugu anlasilsin
      g.frame(ctx, bx, by, bw, bh, P.dark, P.black);
    }

    // Kacinci renkteyiz: n tane nokta, gosterilenler dolu
    var np = 10, gap = 6, toplam = st.n * np + (st.n - 1) * gap;
    var px = Math.round((v.W - toplam) / 2), py = by + bh + 12;
    for (var i = 0; i < st.n; i++) {
      var gecti = st.curIdx >= 0 ? i <= st.curIdx : false;
      g.frame(ctx, px + i * (np + gap), py, np, np, gecti ? P.light : P.dark, P.black);
    }

    f.text(ctx, 'SIRAYI AKLINDA TUT', v.W / 2, py + np + 8, {
      color: P.gray, scale: 1, align: 'center'
    });
  }

  // ---- 2. asama ust seridi ----
  // Hedef sira ARTIK GOSTERILMEZ (oyunun tamami o yuzden var). Burada sadece
  // oyuncunun KENDI kestikleri duruyor - zaten kendisi kesti, bilgi sizmiyor.
  function ilerlemeSeridi(ctx, st, v, ben) {
    f.text(ctx, 'KESTIN:', 6, v.top + 3, { color: P.light, scale: 1 });
    for (var i = 0; i < st.n; i++) {
      var bx = 58 + i * 22;
      var kesildiMi = i < ben.cut.length;
      var renk = kesildiMi ? (st.wires[ben.cut[i]] || {}).col : null;
      var siradaki = i === ben.p;
      g.frame(ctx, bx, v.top + 1, 16, 11, renk || P.dark, siradaki ? P.white : P.black);
      if (siradaki) {
        f.text(ctx, '?', bx + 8, v.top + 3, { color: P.white, scale: 1, align: 'center' });
      }
    }
  }

  PP.MG = PP.MG || {};
  PP.MG.wirecut = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you] || { p: 0, pen: 0, cut: [] };
      var sikisik = ben.pen > 0;

      g.rect(ctx, 0, 0, v.W, v.H, sikisik ? '#3a1a20' : '#141419');

      if (st.showing) {
        ezberEkrani(ctx, st, v);
        return;                       // kablolar daha acilmadi
      }

      ilerlemeSeridi(ctx, st, v, ben);

      // ---- kablolar ----
      for (var k = 0; k < st.wires.length; k++) {
        var w = st.wires[k];
        var kesildi = ben.cut.indexOf(k) >= 0;

        // tutucu plakalar
        g.rect(ctx, w.x - 12, st.top - 7, 24, 7, P.gray);
        g.rect(ctx, w.x - 12, st.bot, 24, 7, P.gray);

        if (!kesildi) {
          g.rect(ctx, w.x - 5, st.top, 10, st.bot - st.top, w.col);
          g.rect(ctx, w.x - 5, st.top, 3, st.bot - st.top, P.white);   // parlama
          g.rect(ctx, w.x + 4, st.top, 1, st.bot - st.top, P.black);   // golge kenar
        } else {
          // kopmus: ustten ve alttan sarkan iki parca
          var orta = (st.top + st.bot) / 2;
          g.rect(ctx, w.x - 5, st.top, 10, orta - st.top - 16, w.col);
          g.rect(ctx, w.x - 5, orta + 16, 10, st.bot - orta - 16, w.col);
          g.rect(ctx, w.x - 9, orta - 19, 9, 5, w.col);
          g.rect(ctx, w.x + 1, orta + 14, 9, 5, w.col);
          g.rect(ctx, w.x - 7, orta - 2, 14, 3, P.dark);               // kivilcim izi
        }
        // Siradaki kabloyu isaretleyen yanip sonen cizgi KALDIRILDI:
        // cevabi ekranda gostermek ezber oyununu anlamsiz kilardi.
      }

      // ---- makas / uyari ----
      if (sikisik) {
        f.text(ctx, 'YANLIS KABLO!', v.W / 2, v.H / 2 - 24, {
          color: P.red, scale: 3, align: 'center', shadow: P.black
        });
        // Basa sardigini soylemek sart: ekranda kablolar bir anda onarilmis
        // gorunuyor, sebebi yazilmazsa oyuncu ne oldugunu anlamiyor.
        f.text(ctx, 'SIRA BASA DONDU', v.W / 2, v.H / 2 + 4, {
          color: P.yellow, scale: 2, align: 'center', shadow: P.black
        });
        f.text(ctx, ben.pen.toFixed(1) + ' SN', v.W / 2, v.H / 2 + 24, {
          color: P.white, scale: 2, align: 'center', shadow: P.black
        });
      } else if (v.ptr) {
        g.sprite(ctx, MAKAS, v.ptr.x - 3, v.ptr.y - 4, 2, { '#': v.ptr.down ? P.yellow : P.light });
      }

      // ---- ilerleme ----
      var n = v.players.length, slotW = v.W / n;
      for (var m = 0; m < n; m++) {
        var p = v.players[m];
        var pd = st.pl[p.id];
        var skor = ' ' + (pd ? pd.p : 0) + '/' + st.n;
        var isim = f.sigdir(p.name, slotW - 4 - f.width(skor, 1), 1);
        f.text(ctx, isim + skor,
          Math.round(slotW * m + slotW / 2), v.H - 9, {
            color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
          });
      }
    }
  };
})(window.PP = window.PP || {});
