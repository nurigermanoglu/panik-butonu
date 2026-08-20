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
    colorForSlot: colorForSlot,
    blobW: 12,
    blobH: 12
  };
})(window.PP = window.PP || {});
