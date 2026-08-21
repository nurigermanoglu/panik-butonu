/* Renk paleti, sprite cizimi ve kucuk yardimcilar */
(function (PP) {
  'use strict';

  // Notr koyu tema: zemin gri/antrasit, vurgular canli. Hangi mini oyun
  // olursa olsun uzerine oturur. Isimler ayni kaldi, bu yuzden butun oyun
  // tek yerden tema degistirir.
  var PAL = {
    bg: '#232145',      // derin lacivert - genel arka plan
    bg2: '#33305e',     // moru andiran ust ton - vurgulu arka plan
    dark: '#171630',    // golge / cerceve ici
    gray: '#7b78a8',    // pasif yazi
    light: '#d9d6f2',   // normal yazi
    white: '#fbfaff',   // one cikan yazi
    yellow: '#ffd34d',
    orange: '#ff8a3c',
    red: '#f45b69',
    green: '#5fe08a',
    teal: '#31c9b7',
    blue: '#49b4ff',
    purple: '#b06cf0',
    black: '#0e0d1c'    // en koyu ton
  };

  // Oyuncu renkleri slot sirasina gore (4 kisiye kadar hazir)
  var SLOT_COLORS = [PAL.orange, PAL.blue, PAL.green, PAL.purple];

  var ARROW_UP = [
    '....#....',
    '...###...',
    '..#####..',
    '.#######.',
    '#########',
    '...###...',
    '...###...',
    '...###...',
    '...###...'
  ];

  function rot90(rows) {
    var h = rows.length, w = rows[0].length, out = [];
    for (var x = 0; x < w; x++) {
      var line = '';
      for (var y = h - 1; y >= 0; y--) line += rows[y][x];
      out.push(line);
    }
    return out;
  }

  var ARROWS = {
    up: ARROW_UP,
    right: rot90(ARROW_UP),
    down: rot90(rot90(ARROW_UP)),
    left: rot90(rot90(rot90(ARROW_UP)))
  };

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function frame(ctx, x, y, w, h, fill, border) {
    rect(ctx, x, y, w, h, border);
    rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  }

  function sprite(ctx, rows, x, y, s, colors) {
    x = Math.round(x); y = Math.round(y);
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        var col = colors[row[c]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x + c * s, y + r * s, s, s);
      }
    }
  }

  function arrow(ctx, dir, x, y, s, color) {
    var rows = ARROWS[dir];
    if (!rows) return;
    sprite(ctx, rows, x, y, s, { '#': color });
  }

  function arrowSize(s) { return 9 * s; }

  /** Ilerleme cubugu */
  function bar(ctx, x, y, w, h, pct, fill, back, border) {
    frame(ctx, x, y, w, h, back || PAL.dark, border || PAL.black);
    var inner = Math.max(0, Math.round((w - 4) * Math.max(0, Math.min(1, pct))));
    if (inner > 0) rect(ctx, x + 2, y + 2, inner, h - 4, fill);
  }

  function colorForSlot(slot) {
    return SLOT_COLORS[slot % SLOT_COLORS.length];
  }

  // ================================================================
  //  DOKULAR
  //
  //  Duz renk yerine metal plaka, zemin derzi, cakil taneleri.
  //  Her doku 16x16'lik bir karo olarak BIR KEZ cizilip desen olarak
  //  saklanir; ekrana tek bir fillRect ile basilir. Boylece binlerce
  //  kucuk dikdortgen cizmek gerekmez.
  //
  //  Karo OYUN pikseli olcusunde uretilir; tuval ic cozunurlukle
  //  buyutulurken yumusatma kapali oldugu icin keskin kalir.
  // ================================================================

  var KARO = 16;
  var dokuOnbellek = {};

  // Ayni karonun her seferinde ayni cikmasi icin sabit sozde-rastgele
  function karisik(x, y, tohum) {
    var n = x * 374761393 + y * 668265263 + tohum * 1274126177;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  }

  var DOKU_TARIF = {
    // Metal panel: plaka ekleri, hafif cizik ve percler
    metal: function (c) {
      c.fillStyle = '#2b2952'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 1);
          if (y % 8 === 7) { c.fillStyle = '#1d1b3c'; c.fillRect(x, y, 1, 1); }      // plaka eki
          else if (r > 0.90) { c.fillStyle = '#393670'; c.fillRect(x, y, 1, 1); }    // isik cizigi
          else if (r < 0.08) { c.fillStyle = '#252348'; c.fillRect(x, y, 1, 1); }
        }
      }
      c.fillStyle = '#454180';
      c.fillRect(0, 0, KARO, 1); c.fillRect(0, 8, KARO, 1);                          // ek ustu isik
      c.fillStyle = '#5b56a0';                                                       // percler
      c.fillRect(1, 1, 1, 1); c.fillRect(KARO - 2, 1, 1, 1);
      c.fillRect(1, 9, 1, 1); c.fillRect(KARO - 2, 9, 1, 1);
    },
    // Zemin karolari: koyu doseme + ince derz
    zemin: function (c) {
      c.fillStyle = '#262450'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 2);
          if (r > 0.93) { c.fillStyle = '#302d5e'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.07) { c.fillStyle = '#201e44'; c.fillRect(x, y, 1, 1); }
        }
      }
      c.fillStyle = '#171630';
      c.fillRect(0, 0, KARO, 1); c.fillRect(0, 0, 1, KARO);                          // derz
      c.fillStyle = '#3b3872';
      c.fillRect(1, 1, KARO - 1, 1);                                                 // derz isigi
    },
    // Cakil: kosu pisti / kostebek zemini
    cakil: function (c) {
      c.fillStyle = '#343163'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 5);
          if (r > 0.92) { c.fillStyle = '#413d78'; c.fillRect(x, y, 1, 1); }         // acik tas
          else if (r < 0.10) { c.fillStyle = '#2a2852'; c.fillRect(x, y, 1, 1); }    // koyu tas
        }
      }
    },
    tas: function (c) {
      c.fillStyle = '#4f4a8c'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 6);
          if (r > 0.90) { c.fillStyle = '#605aa5'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.10) { c.fillStyle = '#3d3a70'; c.fillRect(x, y, 1, 1); }
        }
      }
    }
  };

  function desen(ctx, tip) {
    if (!DOKU_TARIF[tip]) return null;
    if (dokuOnbellek[tip]) return dokuOnbellek[tip];
    if (typeof document === 'undefined') return null;
    var cv = document.createElement('canvas');
    cv.width = KARO; cv.height = KARO;
    var c = cv.getContext('2d');
    if (!c) return null;
    DOKU_TARIF[tip](c);
    var p = ctx.createPattern(cv, 'repeat');
    dokuOnbellek[tip] = p;
    return p;
  }

  /** Dokulu dolgu. tip: 'metal' | 'zemin' | 'cakil' | 'tas' */
  function doku(ctx, x, y, w, h, tip) {
    var p = desen(ctx, tip);
    if (!p) return rect(ctx, x, y, w, h, PAL.bg);
    ctx.save();
    ctx.fillStyle = p;
    // Desen sayfa kokenine gore dosendigi icin karoyu hedefe kaydiriyoruz
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillRect(0, 0, Math.round(w), Math.round(h));
    ctx.restore();
  }

  // ================================================================
  //  FOTOGRAF -> PIXEL ART
  //
  //  Oyundaki gorseller (karakterler, kostebek, cekic, elma...) fotograf
  //  kirpintisi. Kucultunce ortaya binlerce renk ve yumusak, yari saydam
  //  kenarlar cikiyor - yani kucuk bir fotograf, pixel art degil.
  //  Olculdu: bir karakter 2705 renk, 231 saydamlik seviyesi kullaniyordu.
  //
  //  Bu islem uc sey yapar:
  //    1. Saydamligi sertlestirir  -> kenarlar keskin, sisli hale yok
  //    2. Renkleri az sayida tona indirir (medyan kesme) -> pixel art paleti
  //    3. Silueti koyu bir hatla cevreler -> zeminden ayrilir, okunakli olur
  //
  //  Gorsel onbellege alinirken BIR KEZ calisir, her karede degil.
  // ================================================================

  // Medyan kesme: renk bulutunu tekrar tekrar en genis eksenden ikiye boler,
  // her kutunun ortalamasi bir palet rengi olur.
  function paletCikar(pikseller, hedefAdet) {
    var kutular = [pikseller];
    while (kutular.length < hedefAdet) {
      // en cok renk barindiran, bolunebilir kutuyu sec
      var en = -1, enBoy = 1;
      for (var i = 0; i < kutular.length; i++) {
        if (kutular[i].length > enBoy) { enBoy = kutular[i].length; en = i; }
      }
      if (en < 0) break;
      var kutu = kutular[en];
      var minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
      for (var j = 0; j < kutu.length; j++) {
        var p = kutu[j];
        if (p[0] < minR) minR = p[0]; if (p[0] > maxR) maxR = p[0];
        if (p[1] < minG) minG = p[1]; if (p[1] > maxG) maxG = p[1];
        if (p[2] < minB) minB = p[2]; if (p[2] > maxB) maxB = p[2];
      }
      var dR = maxR - minR, dG = maxG - minG, dB = maxB - minB;
      var eksen = dR >= dG && dR >= dB ? 0 : (dG >= dB ? 1 : 2);
      kutu.sort(function (a, b) { return a[eksen] - b[eksen]; });
      var orta = Math.floor(kutu.length / 2);
      if (orta === 0 || orta === kutu.length) break;
      kutular.splice(en, 1, kutu.slice(0, orta), kutu.slice(orta));
    }
    var palet = [];
    for (var k = 0; k < kutular.length; k++) {
      var b2 = kutular[k];
      if (!b2.length) continue;
      var sr = 0, sg = 0, sb = 0;
      for (var m = 0; m < b2.length; m++) { sr += b2[m][0]; sg += b2[m][1]; sb += b2[m][2]; }
      palet.push([Math.round(sr / b2.length), Math.round(sg / b2.length), Math.round(sb / b2.length)]);
    }
    return palet;
  }

  /**
   * pixelArt(cv, opts)
   *   cv: hazir kucultulmus tuval (yerinde degistirilir)
   *   opts: { renk: kac ton (varsayilan 14), hat: dis hat rengi ya da false,
   *           esik: saydamlik esigi (varsayilan 128) }
   */
  function pixelArt(cv, opts) {
    opts = opts || {};
    var adet = opts.renk || 14;
    var esik = opts.esik === undefined ? 128 : opts.esik;
    var hat = opts.hat === undefined ? '#20140c' : opts.hat;

    var c = cv.getContext('2d', { willReadFrequently: true });
    if (!c) return cv;
    var w = cv.width, h = cv.height;
    if (!w || !h) return cv;
    var im = c.getImageData(0, 0, w, h);
    var d = im.data;

    // 1) saydamligi sertlestir
    //    Palet cikarirken TUM pikselleri kullanmak gereksiz pahali; buyuk
    //    resimlerde en fazla ~20 bin piksel orneklemek ayni paleti verir.
    var toplamPiksel = (d.length / 4) | 0;
    var adim = Math.max(1, Math.ceil(toplamPiksel / 20000));
    var opak = [], sayac = 0;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] >= esik) {
        d[i + 3] = 255;
        if ((sayac++ % adim) === 0) opak.push([d[i], d[i + 1], d[i + 2]]);
      } else { d[i + 3] = 0; }
    }
    if (opak.length < 4) { c.putImageData(im, 0, 0); return cv; }

    // 2) renkleri azalt
    //    Her piksel icin paleti bastan taramak yerine 15 bitlik renk
    //    kutucuklarindan olusan bir tablo tutuluyor: ayni tondaki pikseller
    //    hesabi bir kez yapip sonucu paylasiyor.
    var palet = paletCikar(opak, adet);
    var tablo = new Int16Array(32768);
    for (var z = 0; z < tablo.length; z++) tablo[z] = -1;

    for (var j = 0; j < d.length; j += 4) {
      if (d[j + 3] === 0) continue;
      var r = d[j], g2 = d[j + 1], b = d[j + 2];
      var kova = ((r >> 3) << 10) | ((g2 >> 3) << 5) | (b >> 3);
      var idx = tablo[kova];
      if (idx < 0) {
        var enIyi = 0, enYakin = 1e9;
        for (var q = 0; q < palet.length; q++) {
          var pr = palet[q][0] - r, pg = palet[q][1] - g2, pb = palet[q][2] - b;
          var uz = pr * pr + pg * pg + pb * pb;
          if (uz < enYakin) { enYakin = uz; enIyi = q; }
        }
        idx = enIyi;
        tablo[kova] = idx;
      }
      d[j] = palet[idx][0]; d[j + 1] = palet[idx][1]; d[j + 2] = palet[idx][2];
    }

    // 3) siluetin cevresine koyu hat (bos piksel, dolu piksele komsuysa)
    if (hat) {
      var hr = parseInt(hat.slice(1, 3), 16), hg = parseInt(hat.slice(3, 5), 16), hb = parseInt(hat.slice(5, 7), 16);
      var kopya = new Uint8ClampedArray(d);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var o = (y * w + x) * 4;
          if (kopya[o + 3] !== 0) continue;
          var komsu = false;
          if (x > 0 && kopya[o - 4 + 3] !== 0) komsu = true;
          else if (x < w - 1 && kopya[o + 4 + 3] !== 0) komsu = true;
          else if (y > 0 && kopya[o - w * 4 + 3] !== 0) komsu = true;
          else if (y < h - 1 && kopya[o + w * 4 + 3] !== 0) komsu = true;
          if (komsu) { d[o] = hr; d[o + 1] = hg; d[o + 2] = hb; d[o + 3] = 255; }
        }
      }
    }

    c.putImageData(im, 0, 0);
    return cv;
  }

  // ================================================================
  //  PANELLER
  //
  //  Stardew'daki gibi: koyu dis hat, ahsap cerceve, ic isik cizgisi,
  //  parsomen dolgu ve koselerde civi/perc.
  // ================================================================

  /**
   * panel(ctx, x, y, w, h, opts)
   *   opts: { dolgu, cerceve, koyu, isik, civi }
   *   Varsayilan: parsomen dolgu + ahsap cerceve.
   */
  function panel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    var dolgu = opts.dolgu || '#d9d6f2';
    var cerceve = opts.cerceve || '#4a4590';
    var koyu = opts.koyu || '#0e0d1c';
    var isik = opts.isik || '#6b64c0';
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (w < 8 || h < 8) return;

    rect(ctx, x, y, w, h, koyu);                       // dis hat
    rect(ctx, x + 1, y + 1, w - 2, h - 2, cerceve);    // ahsap cerceve
    rect(ctx, x + 1, y + 1, w - 2, 1, isik);           // cerceve ustu isik
    rect(ctx, x + 1, y + h - 2, w - 2, 1, koyu);       // cerceve alti golge
    rect(ctx, x + 3, y + 3, w - 6, h - 6, koyu);       // ic hat
    rect(ctx, x + 4, y + 4, w - 8, h - 8, dolgu);      // parsomen
    rect(ctx, x + 4, y + 4, w - 8, 1, '#fbfaff');      // panel ustu isik

    if (opts.civi !== false && w >= 16 && h >= 16) {   // kose percleri
      var c = [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]];
      for (var i = 0; i < c.length; i++) {
        rect(ctx, c[i][0], c[i][1], 2, 2, koyu);
        rect(ctx, c[i][0], c[i][1], 1, 1, '#8f88d8');
      }
    }
  }

  /** Metal levha: baslik/isim icin. Dolgusu da metal. */
  function tabela(ctx, x, y, w, h) {
    panel(ctx, x, y, w, h, {
      dolgu: '#33305e', cerceve: '#5b56a0', koyu: '#0e0d1c', isik: '#7a73d0'
    });
    // plaka cizgileri
    for (var i = y + 7; i < y + h - 5; i += 4) {
      rect(ctx, x + 6, i, w - 12, 1, '#2a2852');
    }
  }

  // Ic cozunurluk carpani: tuval ekranda kac kat gorunuyorsa o kadar buyuk cizilir.
  // Resim onbellekleri bu degeri kullanip o oranda detayli hazirlanir.
  PP.res = { olcek: 1 };

  PP.gfx = {
    PAL: PAL,
    SLOT_COLORS: SLOT_COLORS,
    rect: rect,
    frame: frame,
    sprite: sprite,
    arrow: arrow,
    arrowSize: arrowSize,
    bar: bar,
    doku: doku,
    pixelArt: pixelArt,
    panel: panel,
    tabela: tabela,
    colorForSlot: colorForSlot
  };
})(window.PP = window.PP || {});
