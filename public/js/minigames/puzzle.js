/* PUZZLE - ekran cizimi (gercek elma resimleriyle) */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;
  // Ekrandaki her yazi dil dosyasindan gelir (bkz. js/dil.js)
  var t = function () { return PP.dil.t.apply(PP.dil, arguments); };

  // Resimler ve icindeki elmanin kirpma kutusu (olculerek bulundu)
  var KAYNAK = [
    { src: 'img/elma1.png', kirp: { x: 126, y: 103, w: 391, h: 435 } },
    { src: 'img/elma2.png', kirp: { x: 84, y: 102, w: 391, h: 437 } }
  ];

  var img = [], yuklendi = [], hatali = [], onbellek = [], onbellekBoyut = [];

  for (var i = 0; i < KAYNAK.length; i++) {
    (function (k) {
      yuklendi[k] = false;
      hatali[k] = false;
      onbellek[k] = null;
      onbellekBoyut[k] = '';
      var im = new Image();
      im.onload = function () { yuklendi[k] = true; };
      im.onerror = function () { hatali[k] = true; };
      im.src = KAYNAK[k].src;
      img[k] = im;
    })(i);
  }

  // Resmi izgara boyutuna BIR KEZ yumusak kucultup saklar; hucreler sonra 1:1 cizilir.
  // Boylece kirpik dither deseni bulaniklasmadan temiz kuculur ve her karede yeniden
  // olceklendirme yapilmaz.
  function kaynak(k, gw, gh) {
    if (!yuklendi[k]) return null;
    var anahtar = gw + 'x' + gh;
    if (onbellekBoyut[k] !== anahtar) {
      var cv = document.createElement('canvas');
      cv.width = gw; cv.height = gh;
      var c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in c2) c2.imageSmoothingQuality = 'high';
      var kr = KAYNAK[k].kirp;
      c2.drawImage(img[k], kr.x, kr.y, kr.w, kr.h, 0, 0, gw, gh);
      PP.gfx.pixelArt(cv, { renk: 24, hat: false });       // bulmaca resmi: hat yok
      onbellek[k] = cv;
      onbellekBoyut[k] = anahtar;
    }
    return onbellek[k];
  }

  PP.MG = PP.MG || {};
  PP.MG.puzzle = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you];
      var zemin = ben && ben.fl === 1 ? '#1f3a24' : ben && ben.fl === 2 ? '#3a1a20' : P.bg;
      g.rect(ctx, 0, 0, v.W, v.H, zemin);

      var ic = (PP.res && PP.res.olcek) || 1;   // ekranda kac kat gorunuyorsa o kadar detay
      var gw = st.cols * st.cw, gh = st.rows * st.ch;
      var idx = st.img | 0;
      var kynk = kaynak(idx, gw * ic, gh * ic);
      // Istenen resim gelmediyse (indirilemedi) bos ekran gostermek yerine
      // yuklenmis baska bir resme dus - bulmaca yine kendi icinde tutarli kalir.
      if (!kynk && hatali[idx]) {
        for (var y = 0; y < KAYNAK.length; y++) {
          kynk = kaynak(y, gw * ic, gh * ic);
          if (kynk) break;
        }
      }

      // resim cercevesi
      g.frame(ctx, st.gx - 3, st.gy - 3, gw + 6, gh + 6, '#1e1e24', P.gray);

      if (!kynk) {
        f.text(ctx, t('ic.puzzle.yukleniyor'), v.W / 2, st.gy + gh / 2, {
          color: P.light, scale: 1, align: 'center'
        });
        return;
      }

      function hucreCiz(cellIdx, dx, dy) {
        var c = cellIdx % st.cols, r = Math.floor(cellIdx / st.cols);
        ctx.drawImage(kynk, c * st.cw * ic, r * st.ch * ic, st.cw * ic, st.ch * ic,
          Math.round(dx), Math.round(dy), st.cw, st.ch);
      }

      // ---- izgara ----
      for (var hi = 0; hi < st.cols * st.rows; hi++) {
        var cx = st.gx + (hi % st.cols) * st.cw;
        var cy = st.gy + Math.floor(hi / st.cols) * st.ch;
        var eksikMi = st.miss.indexOf(hi) >= 0;

        if (!eksikMi) { hucreCiz(hi, cx, cy); continue; }

        // eksik kare: bu oyuncu doldurmus mu?
        var takili = false;
        if (ben) {
          for (var q = 0; q < ben.p.length; q++) {
            if (ben.p[q].st === 2 && ben.p[q].c === hi) { takili = true; break; }
          }
        }
        if (takili) {
          hucreCiz(hi, cx, cy);
          g.rect(ctx, cx, cy, st.cw, 1, P.green);
          g.rect(ctx, cx, cy + st.ch - 1, st.cw, 1, P.green);
        } else {
          g.rect(ctx, cx, cy, st.cw, st.ch, '#141419');
          for (var dd = 0; dd < st.cw; dd += 5) {          // kesikli cerceve
            g.rect(ctx, cx + dd, cy, 3, 1, P.dark);
            g.rect(ctx, cx + dd, cy + st.ch - 1, 3, 1, P.dark);
          }
          for (var de = 0; de < st.ch; de += 5) {
            g.rect(ctx, cx, cy + de, 1, 3, P.dark);
            g.rect(ctx, cx + st.cw - 1, cy + de, 1, 3, P.dark);
          }
        }
      }

      if (ben) {
        // ---- alttaki bekleyen parcalar ----
        for (var k = 0; k < ben.p.length; k++) {
          var pc = ben.p[k];
          if (pc.st !== 0) continue;
          g.frame(ctx, pc.x - st.cw / 2 - 1, pc.y - st.ch / 2 - 1, st.cw + 2, st.ch + 2,
            '#1e1e24', P.gray);
          hucreCiz(pc.c, pc.x - st.cw / 2, pc.y - st.ch / 2);
        }

        // ---- elimdeki parca: YEREL parmak konumunda (gecikmesiz) ----
        if (ben.h >= 0) {
          var hp = ben.p[ben.h];
          var hx = v.ptr && v.ptr.down ? v.ptr.x : hp.x;
          var hy = v.ptr && v.ptr.down ? v.ptr.y : hp.y;
          hucreCiz(hp.c, hx - st.cw / 2, hy - st.ch / 2);
          g.rect(ctx, hx - st.cw / 2 - 1, hy - st.ch / 2 - 1, st.cw + 2, 1, P.white);
          g.rect(ctx, hx - st.cw / 2 - 1, hy + st.ch / 2, st.cw + 2, 1, P.white);
          g.rect(ctx, hx - st.cw / 2 - 1, hy - st.ch / 2, 1, st.ch, P.white);
          g.rect(ctx, hx + st.cw / 2, hy - st.ch / 2, 1, st.ch, P.white);
        }
      }

      // ---- skorlar ----
      // Buradaki "PARCALAR" basligi kaldirildi: (252, gy-8) = (252, 24)
      // noktasina cizilirken isim satiri da y=24'e cizildigi icin dort
      // kisilik odada 4. oyuncunun adiyla ust uste biniyordu. Basligin
      // altina alacak yer de yok (parcalar y=39'da basliyor) ve zaten
      // bilgi katmiyordu - sagda alt alta duran uc parca kendini anlatiyor.

      // Diger oyunlarla ayni yerlesim: sabit adim (6 + j*108) 4. oyuncuyu
      // x=330'a atiyordu, tuval ise 320 genis - isim ekrandan tasiyordu.
      var n = v.players.length, slotW = v.W / n;
      for (var j = 0; j < n; j++) {
        var p = v.players[j];
        var pd = st.pl[p.id];
        var skor = ' ' + (pd ? pd.s : 0) + '/' + st.total;
        var ad = f.sigdir(p.name, slotW - 4 - f.width(skor, 1), 1);
        f.text(ctx, ad + skor,
          Math.round(slotW * j + slotW / 2), v.top + 2, {
            color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
          });
      }
    }
  };
})(window.PP = window.PP || {});
