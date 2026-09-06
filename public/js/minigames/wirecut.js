/* KABLO KESME - ekran cizimi
 *
 * Oyunun tek kurali var ve ekranda gorunmesi gereken tek sey o: kivilcim
 * MAKAS BANDINA girdiginde kes. O yuzden band ekranin en belirgin ogesi;
 * kivilcim yaklastikca band da tepki veriyor (parliyor), yani oyuncu
 * saati degil ekrani izleyerek zamanliyor.
 *
 * Renk tek basina isaret degil: bandin iki yaninda makas disleri var ve
 * kivilcim bandin icindeyken beyaz cekirdekli cizilir - renk ayirt
 * edemeyen biri de "simdi" anini gorebilir.
 */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;
  // Ekrandaki her yazi dil dosyasindan gelir (bkz. js/dil.js)
  var t = function () { return PP.dil.t.apply(PP.dil, arguments); };

  // Bomba gorseli - Kostebek Avi / Sicak Patates / Dusenleri Yakala ile ayni
  var BOMBA = { src: 'img/bomba.png', kirp: { x: 62, y: 69, w: 483, h: 383 }, w: 30, h: 24 };
  var bombaImg = new Image(), bombaYuklendi = false, bombaOnbellek = null;
  bombaImg.onload = function () { bombaYuklendi = true; };
  bombaImg.src = BOMBA.src;

  function bombaHazir() {
    if (!bombaYuklendi) return null;
    var ic = (PP.res && PP.res.olcek) || 1;
    if (!bombaOnbellek || bombaOnbellek._ic !== ic) {
      var cv = document.createElement('canvas');
      cv.width = BOMBA.w * ic; cv.height = BOMBA.h * ic;
      var c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in c2) c2.imageSmoothingQuality = 'high';
      c2.drawImage(bombaImg, BOMBA.kirp.x, BOMBA.kirp.y, BOMBA.kirp.w, BOMBA.kirp.h,
        0, 0, BOMBA.w * ic, BOMBA.h * ic);
      PP.gfx.pixelArt(cv, { renk: 10, hat: '#0b0b0f' });
      cv._ic = ic;
      bombaOnbellek = cv;
    }
    return bombaOnbellek;
  }

  // Makas (kapali) - basit pixel silueti
  var MAKAS = [
    '.#.....#.',
    '.##...##.',
    '..##.##..',
    '...###...',
    '....#....',
    '...###...',
    '..#...#..',
    '.#.....#.',
    '.#.....#.'
  ];

  PP.MG = PP.MG || {};
  PP.MG.wirecut = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you] || { s: 0, pen: 0, fl: 0, kes: [] };
      var gec = v.gecikme || 0;
      var i, k;

      // ---- zemin ----
      g.doku(ctx, 0, 0, v.W, v.H, 'metal');
      if (ben.fl) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        g.rect(ctx, 0, v.top, v.W, v.H - v.top, ben.fl === 1 ? P.green : P.red);
        ctx.restore();
      }

      // ---- kablolar ----
      for (i = 0; i < st.wires.length; i++) {
        var wx = Math.round(st.wires[i].x);
        g.rect(ctx, wx - 3, st.top, 6, st.bot - st.top, '#0b0b16');       // hat
        g.rect(ctx, wx - 2, st.top, 4, st.bot - st.top, st.wires[i].col);
        g.rect(ctx, wx - 2, st.top, 1, st.bot - st.top, '#ffffff22');     // isik
        // Ust ucta kelepce
        g.rect(ctx, wx - 5, st.top - 4, 10, 5, '#2a2852');
        g.rect(ctx, wx - 4, st.top - 3, 8, 3, '#5b56a0');
      }

      // ---- bomba (kablolarin ucu) ----
      // Bomba ekranin en altina oturur; kablolar icine giriyor gibi durur.
      // (Kablolarin bitis cizgisi st.bot, bomba onun uzerine binerek cizilir.)
      var bres = bombaHazir();
      var bx = Math.round(v.W / 2 - BOMBA.w / 2), by = v.H - BOMBA.h;
      g.rect(ctx, 0, st.bot, v.W, v.H - st.bot, '#1a1830');
      g.rect(ctx, 0, st.bot, v.W, 1, '#6b64c0');
      if (bres) ctx.drawImage(bres, bx, by, BOMBA.w, BOMBA.h);
      else { g.rect(ctx, bx, by, BOMBA.w, BOMBA.h, P.dark); g.rect(ctx, bx + 2, by + 2, BOMBA.w - 4, BOMBA.h - 4, '#3a3560'); }

      // ---- makas bandi ----
      // Bandda kivilcim varsa band canlanir: oyuncu "simdi" anini buradan okur
      var bandda = false;
      for (i = 0; i < st.k.length; i++) {
        k = st.k[i];
        var ky = k.y + (k.v || 0) * gec;
        if (ky >= st.ky && ky <= st.ky + st.kh && ben.kes.indexOf(k.i) < 0) bandda = true;
      }
      var bandRenk = bandda ? '#ffd34d' : '#4a4590';
      ctx.save();
      ctx.globalAlpha = bandda ? 0.3 : 0.16;
      g.rect(ctx, 0, st.ky, v.W, st.kh, bandRenk);
      ctx.restore();
      g.rect(ctx, 0, st.ky, v.W, 1, bandRenk);
      g.rect(ctx, 0, st.ky + st.kh - 1, v.W, 1, bandRenk);

      // Bandin iki yaninda makas disleri - bandin ne oldugu yazisiz anlasilsin
      for (var s = 0; s < 2; s++) {
        var sx = s === 0 ? 2 : v.W - 11;
        g.sprite(ctx, MAKAS, sx, st.ky + Math.round(st.kh / 2) - 4, 1,
          { '#': bandda ? P.yellow : '#7a73d0' });
      }

      // ---- kivilcimlar ----
      for (i = 0; i < st.k.length; i++) {
        k = st.k[i];
        if (ben.kes.indexOf(k.i) >= 0) continue;           // bunu ben kestim
        // Paketler arasinda konumu hizla suzerek ilerlet -> akici inis
        var y = k.y + (k.v || 0) * gec;
        if (y > st.bot) continue;
        var x = Math.round(st.wires[k.w].x);
        var icerde = y >= st.ky && y <= st.ky + st.kh;

        // Kuyruk: kivilcimin arkasinda sonen iz
        for (var t = 1; t <= 4; t++) {
          var ty = Math.round(y - t * 3);
          if (ty < st.top) break;
          ctx.save();
          ctx.globalAlpha = 0.5 - t * 0.1;
          g.rect(ctx, x - 2, ty, 4, 2, st.wires[k.w].col);
          ctx.restore();
        }
        // Cekirdek: bandin icindeyken BEYAZ (renkten bagimsiz isaret)
        var cy = Math.round(y);
        g.rect(ctx, x - 4, cy - 2, 8, 5, '#000000');
        g.rect(ctx, x - 3, cy - 1, 6, 3, icerde ? '#ffffff' : st.wires[k.w].col);
        if (icerde) {
          // Bandda: etrafina kivilcim sacar
          var p2 = Math.floor(v.time * 20) % 2 === 0 ? 2 : 3;
          g.rect(ctx, x - 4 - p2, cy, 2, 1, P.yellow);
          g.rect(ctx, x + 3 + p2, cy, 2, 1, P.yellow);
        }
      }

      // ---- makas imleci ----
      if (v.ptr) {
        var sikisik = ben.pen > 0;
        var mx = Math.round(v.ptr.x) - 4, my = Math.round(v.ptr.y) - 4;
        var titre = sikisik ? Math.round(Math.sin(v.time * 40) * 1) : 0;
        g.sprite(ctx, MAKAS, mx + titre, my, 1, { '#': sikisik ? P.red : '#e8e6ff' });
      }

      // ---- skorlar ----
      var n = v.players.length, slotW = v.W / n;
      for (i = 0; i < n; i++) {
        var p = v.players[i];
        var pd = st.pl[p.id];
        var skor = ' ' + (pd ? pd.s : 0);
        var isim = f.sigdir(p.name, slotW - 4 - f.width(skor, 1), 1);
        f.text(ctx, isim + skor, Math.round(slotW * i + slotW / 2), v.top + 2, {
          color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
        });
      }

      // ---- durum yazisi ----
      // Sol alt kose: ust satir isimlere, ekranin ortasi bombaya ait.
      // Uc yerin de kalabaliklasmamasi icin yazi kenara alindi.
      if (ben.pen > 0) {
        var yanip = Math.floor(v.time * 10) % 2 === 0;
        f.text(ctx, t('ic.wirecut.sikisti'), 4, v.H - 9, {
          color: yanip ? P.red : '#ff9a8f', scale: 1, align: 'left', shadow: P.black
        });
      } else {
        f.text(ctx, t(bandda ? 'ic.wirecut.simdiKes' : 'ic.wirecut.banttaKes'), 4, v.H - 9, {
          color: bandda ? P.yellow : P.gray, scale: 1, align: 'left', shadow: P.black
        });
      }
    }
  };
})(window.PP = window.PP || {});
