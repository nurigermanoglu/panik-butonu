/* SEKIL YERLESTIR - ahsap oyuncak gorunumlu ekran cizimi */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  // 11x11 desenler, 2 kat olcekle 22x22 cizilir
  var SEKILLER = {
    kare: [
      '###########',
      '###########',
      '###########',
      '###########',
      '###########',
      '###########',
      '###########',
      '###########',
      '###########',
      '###########',
      '###########'
    ],
    ucgen: [
      '.....#.....',
      '.....#.....',
      '....###....',
      '....###....',
      '...#####...',
      '...#####...',
      '..#######..',
      '..#######..',
      '.#########.',
      '.#########.',
      '###########'
    ],
    daire: [
      '...#####...',
      '..#######..',
      '.#########.',
      '###########',
      '###########',
      '###########',
      '###########',
      '###########',
      '.#########.',
      '..#######..',
      '...#####...'
    ],
    arti: [
      '....###....',
      '....###....',
      '....###....',
      '....###....',
      '###########',
      '###########',
      '###########',
      '....###....',
      '....###....',
      '....###....',
      '....###....'
    ],
    yildiz: [
      '.....#.....',
      '....###....',
      '....###....',
      '###########',
      '.#########.',
      '..#######..',
      '..#######..',
      '.###...###.',
      '.##.....##.',
      '.#.......#.',
      '#.........#'
    ]
  };

  var OLCEK = 2;
  var S = 11 * OLCEK;              // cizim boyutu = 22

  // tahta (ust panel) tonlari
  var AHSAP_KOYU = '#5a3a22';
  var AHSAP = '#8a5a34';
  var AHSAP_ACIK = '#b07a45';
  var AHSAP_PARLAK = '#c9955c';
  var DELIK = '#241608';

  // Her blogun kendi boyasi - ahsap oyuncaklardaki gibi renkli
  var BOYA = {
    kare: { ana: '#4a7fc1', acik: '#82abe4', koyu: '#2f5588' },
    ucgen: { ana: '#c1503f', acik: '#e2836e', koyu: '#88342a' },
    daire: { ana: '#4fa050', acik: '#7fcb7f', koyu: '#357036' },
    arti: { ana: '#d4a63c', acik: '#f2cc66', koyu: '#9a7626' },
    yildiz: { ana: '#9a5fb0', acik: '#c391d6', koyu: '#6d3d80' }
  };

  function sekilCiz(ctx, tip, cx, cy, renk) {
    var rows = SEKILLER[tip];
    if (!rows) return;
    g.sprite(ctx, rows, Math.round(cx - S / 2), Math.round(cy - S / 2), OLCEK, { '#': renk });
  }

  // Boyali ahsap blok: govde + damar cizgileri + ust kenar isigi
  function ahsapSekil(ctx, tip, cx, cy) {
    var b = BOYA[tip] || { ana: AHSAP_ACIK, acik: AHSAP_PARLAK, koyu: AHSAP };
    sekilCiz(ctx, tip, cx, cy, b.ana);
    var rows = SEKILLER[tip];
    var x0 = Math.round(cx - S / 2), y0 = Math.round(cy - S / 2);
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        if (rows[r][c] !== '#') continue;
        var px = x0 + c * OLCEK, py = y0 + r * OLCEK;
        // Yuzeyde cizgi yok - sadece dis kenarlarda isik/golge
        if (r === 0 || rows[r - 1][c] !== '#') {
          g.rect(ctx, px, py, OLCEK, 1, b.acik);                            // ust kenar isigi
        }
        if (r === rows.length - 1 || rows[r + 1][c] !== '#') {
          g.rect(ctx, px, py + OLCEK - 1, OLCEK, 1, b.koyu);                // alt kenar golgesi
        }
      }
    }
  }

  PP.MG = PP.MG || {};
  PP.MG.shapesort = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you];
      var yanip = ben && ben.fl === 2;
      g.rect(ctx, 0, 0, v.W, v.H, yanip ? '#3a2028' : '#2a1a10');

      // ---- ust: delikli ahsap tahta ----
      var tx = 6, ty = st.slots[0].y - 26, tw = v.W - 12, th = 52;
      g.rect(ctx, tx, ty + 2, tw, th, AHSAP_KOYU);            // golge
      g.rect(ctx, tx, ty, tw, th - 2, AHSAP);
      g.rect(ctx, tx, ty, tw, 2, AHSAP_PARLAK);               // ust kenar isigi
      for (var d = 0; d < th - 6; d += 7) {                    // damarlar
        g.rect(ctx, tx + 3, ty + 4 + d, tw - 6, 1, AHSAP_ACIK);
      }
      for (var vd = 0; vd < tw; vd += 46) {                    // tahta ekleri
        g.rect(ctx, tx + vd, ty, 1, th - 2, AHSAP_KOYU);
      }
      // vidalar
      [tx + 5, tx + tw - 7].forEach(function (sx) {
        [ty + 4, ty + th - 9].forEach(function (sy) {
          g.rect(ctx, sx, sy, 3, 3, AHSAP_KOYU);
          g.rect(ctx, sx + 1, sy, 1, 3, AHSAP_PARLAK);
        });
      });

      // ---- delikler ve yerlesmis parcalar ----
      for (var i = 0; i < st.slots.length; i++) {
        var sl = st.slots[i];
        var dolu = ben ? ben.sh.some(function (q) { return q.st === 2 && q.sl === i; }) : false;
        if (dolu) {
          sekilCiz(ctx, sl.tip, sl.x, sl.y, DELIK);              // delige oturmus golge
          ahsapSekil(ctx, sl.tip, sl.x, sl.y - 1);               // blok bir tik yukarida
        } else {
          sekilCiz(ctx, sl.tip, sl.x + 1, sl.y + 1, '#1a0f06');  // delik golgesi
          sekilCiz(ctx, sl.tip, sl.x, sl.y, DELIK);              // delik
        }
      }

      // ---- alt: zemin ----
      g.rect(ctx, 0, st.slots[0].y + 60, v.W, v.H - st.slots[0].y - 60, '#3a2416');
      g.rect(ctx, 0, st.slots[0].y + 60, v.W, 1, AHSAP_KOYU);

      if (ben) {
        // bekleyen bloklar
        for (var m = 0; m < ben.sh.length; m++) {
          var q2 = ben.sh[m];
          if (q2.st !== 0) continue;
          g.rect(ctx, q2.x - S / 2 + 2, q2.y + S / 2 - 2, S - 4, 3, '#1a0f06');  // golge
          ahsapSekil(ctx, q2.t, q2.x, q2.y);
        }
        // elimdeki blok: YEREL parmak konumunda
        if (ben.h >= 0) {
          var hq = ben.sh[ben.h];
          var hx = v.ptr && v.ptr.down ? v.ptr.x : hq.x;
          var hy = v.ptr && v.ptr.down ? v.ptr.y : hq.y;
          sekilCiz(ctx, hq.t, hx + 2, hy + 3, '#1a0f06');       // golge
          ahsapSekil(ctx, hq.t, hx, hy);
        }
      }

      // ---- skorlar ----
      var n = v.players.length, slotW = v.W / n;
      for (var j = 0; j < n; j++) {
        var p = v.players[j];
        var pd = st.pl[p.id];
        f.text(ctx, p.name + ' ' + (pd ? pd.s : 0) + '/' + st.total,
          Math.round(slotW * j + slotW / 2), v.top + 2, {
            color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
          });
      }
    }
  };
})(window.PP = window.PP || {});
