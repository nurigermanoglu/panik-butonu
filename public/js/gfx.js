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
    panel: panel,
    tabela: tabela,
    colorForSlot: colorForSlot,
    blobW: 12,
    blobH: 12
  };
})(window.PP = window.PP || {});
