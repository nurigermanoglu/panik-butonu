/* Renk paleti, sprite cizimi ve kucuk yardimcilar */
(function (PP) {
  'use strict';

  // Stardew Valley havasi: soguk mavi/mor yerine sicak ahsap, parsomen ve
  // tarla yesilleri. Isimler ayni kaldi, bu yuzden butun oyun tek yerden
  // yeni temaya gecer.
  var PAL = {
    bg: '#3d2b1f',      // koyu ahsap - genel arka plan
    bg2: '#5a4029',     // acik ahsap - vurgulu arka plan
    dark: '#2a1c12',    // golge / cerceve ici
    gray: '#8a7050',    // solgun ahsap - pasif yazi
    light: '#e8d5a8',   // parsomen - normal yazi
    white: '#fff4dc',   // sicak beyaz - one cikan yazi
    yellow: '#f5c542',  // bugday sarisi
    orange: '#e08a3c',  // kabak turuncusu
    red: '#c0503f',     // kiremit kirmizisi
    green: '#9bd45a',   // taze yaprak
    teal: '#4a9d5f',    // koyu yaprak
    blue: '#5aa9e6',    // gokyuzu
    purple: '#a06cb5',  // lavanta
    black: '#1a1108'    // en koyu ton
  };

  // Oyuncu renkleri slot sirasina gore (4 kisiye kadar hazir)
  var SLOT_COLORS = [PAL.orange, PAL.blue, PAL.green, PAL.purple];

  var BLOB = [
    '....xxxx....',
    '..xx####xx..',
    '.x########x.',
    'x##########x',
    'x##oo##oo##x',
    'x##ox##ox##x',
    'x##########x',
    'x##x####x##x',
    'x###xxxx###x',
    '.x########x.',
    '..xx####xx..',
    '....xxxx....'
  ];

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

  /** Oyuncu karakteri. opts: { dead, scale, squash } */
  function blob(ctx, x, y, color, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var colors = opts.dead
      ? { '#': PAL.gray, 'x': PAL.dark, 'o': PAL.dark }
      : { '#': color, 'x': PAL.black, 'o': PAL.white };
    sprite(ctx, BLOB, x, y, s, colors);
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
  //  Duz renk yerine ahsap damari, cim tutamlari, toprak taneleri.
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
    ahsap: function (c) {
      c.fillStyle = '#6b4d31'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 1);
          if (y % 8 === 7) { c.fillStyle = '#4a341f'; c.fillRect(x, y, 1, 1); }      // tahta eki
          else if (r > 0.88) { c.fillStyle = '#7d5b3b'; c.fillRect(x, y, 1, 1); }    // acik damar
          else if (r < 0.10) { c.fillStyle = '#5a4029'; c.fillRect(x, y, 1, 1); }    // koyu damar
        }
      }
      c.fillStyle = '#8a6a45';
      c.fillRect(0, 0, KARO, 1); c.fillRect(0, 8, KARO, 1);                          // ek ustu isik
    },
    cim: function (c) {
      c.fillStyle = '#3f7a3a'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 2);
          if (r > 0.90) { c.fillStyle = '#5a9b45'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.12) { c.fillStyle = '#33632f'; c.fillRect(x, y, 1, 1); }
        }
      }
      // ot tutamlari
      for (var t = 0; t < 5; t++) {
        var tx = Math.floor(karisik(t, 0, 3) * KARO), ty = Math.floor(karisik(0, t, 4) * KARO);
        c.fillStyle = '#6cb050';
        c.fillRect(tx, ty, 1, 2); c.fillRect(tx + 1, ty + 1, 1, 1);
      }
    },
    toprak: function (c) {
      c.fillStyle = '#6b4d31'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 5);
          if (r > 0.93) { c.fillStyle = '#8a6a45'; c.fillRect(x, y, 1, 1); }         // tane
          else if (r < 0.09) { c.fillStyle = '#513922'; c.fillRect(x, y, 1, 1); }    // cakil
        }
      }
    },
    tas: function (c) {
      c.fillStyle = '#7d7566'; c.fillRect(0, 0, KARO, KARO);
      for (var y = 0; y < KARO; y++) {
        for (var x = 0; x < KARO; x++) {
          var r = karisik(x, y, 6);
          if (r > 0.90) { c.fillStyle = '#98907f'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.10) { c.fillStyle = '#635c50'; c.fillRect(x, y, 1, 1); }
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

  /** Dokulu dolgu. tip: 'ahsap' | 'cim' | 'toprak' | 'tas' */
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
    var dolgu = opts.dolgu || '#e8d5a8';
    var cerceve = opts.cerceve || '#8a5a34';
    var koyu = opts.koyu || '#3d2b1f';
    var isik = opts.isik || '#b07a45';
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (w < 8 || h < 8) return;

    rect(ctx, x, y, w, h, koyu);                       // dis hat
    rect(ctx, x + 1, y + 1, w - 2, h - 2, cerceve);    // ahsap cerceve
    rect(ctx, x + 1, y + 1, w - 2, 1, isik);           // cerceve ustu isik
    rect(ctx, x + 1, y + h - 2, w - 2, 1, koyu);       // cerceve alti golge
    rect(ctx, x + 3, y + 3, w - 6, h - 6, koyu);       // ic hat
    rect(ctx, x + 4, y + 4, w - 8, h - 8, dolgu);      // parsomen
    rect(ctx, x + 4, y + 4, w - 8, 1, '#fff4dc');      // parsomen ustu isik

    if (opts.civi !== false && w >= 16 && h >= 16) {   // kose percleri
      var c = [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]];
      for (var i = 0; i < c.length; i++) {
        rect(ctx, c[i][0], c[i][1], 2, 2, koyu);
        rect(ctx, c[i][0], c[i][1], 1, 1, '#d8b98a');
      }
    }
  }

  /** Ahsap tabela: baslik/isim icin. Dolgusu da ahsap. */
  function tabela(ctx, x, y, w, h) {
    panel(ctx, x, y, w, h, {
      dolgu: '#8a5a34', cerceve: '#5a3a22', koyu: '#2a1c12', isik: '#a87a4a'
    });
    // tahta damari
    for (var i = y + 7; i < y + h - 5; i += 4) {
      rect(ctx, x + 6, i, w - 12, 1, '#7d5230');
    }
  }

  // Ic cozunurluk carpani: tuval ekranda kac kat gorunuyorsa o kadar buyuk cizilir.
  // Resim onbellekleri bu degeri kullanip o oranda detayli hazirlanir.
  PP.res = { olcek: 1 };

  PP.gfx = {
    PAL: PAL,
    SLOT_COLORS: SLOT_COLORS,
    BLOB: BLOB,
    rect: rect,
    frame: frame,
    sprite: sprite,
    blob: blob,
    arrow: arrow,
    arrowSize: arrowSize,
    bar: bar,
    doku: doku,
    pixelArt: pixelArt,
    panel: panel,
    tabela: tabela,
    colorForSlot: colorForSlot,
    blobW: 12,
    blobH: 12
  };
})(window.PP = window.PP || {});
