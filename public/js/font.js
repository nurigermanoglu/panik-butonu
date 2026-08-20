/* 5x7 bitmap pixel font + Turkce harfler */
(function (PP) {
  'use strict';

  var G = {
    'A': '.###./#...#/#...#/#####/#...#/#...#/#...#',
    'B': '####./#...#/#...#/####./#...#/#...#/####.',
    'C': '.###./#...#/#..../#..../#..../#...#/.###.',
    'D': '####./#...#/#...#/#...#/#...#/#...#/####.',
    'E': '#####/#..../#..../####./#..../#..../#####',
    'F': '#####/#..../#..../####./#..../#..../#....',
    'G': '.###./#...#/#..../#.###/#...#/#...#/.###.',
    'H': '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    'I': '#####/..#../..#../..#../..#../..#../#####',
    'J': '..###/...#./...#./...#./...#./#..#./.##..',
    'K': '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    'L': '#..../#..../#..../#..../#..../#..../#####',
    'M': '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
    'N': '#...#/##..#/##..#/#.#.#/#..##/#..##/#...#',
    'O': '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    'P': '####./#...#/#...#/####./#..../#..../#....',
    'Q': '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    'R': '####./#...#/#...#/####./#.#../#..#./#...#',
    'S': '.####/#..../#..../.###./....#/....#/####.',
    'T': '#####/..#../..#../..#../..#../..#../..#..',
    'U': '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
    'V': '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
    'W': '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    'X': '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
    'Y': '#...#/#...#/.#.#./..#../..#../..#../..#..',
    'Z': '#####/....#/...#./..#../.#.../#..../#####',
    '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
    '1': '..#../.##../..#../..#../..#../..#../.###.',
    '2': '.###./#...#/....#/...#./..#../.#.../#####',
    '3': '####./....#/....#/.###./....#/....#/####.',
    '4': '#..#./#..#./#..#./#####/...#./...#./...#.',
    '5': '#####/#..../####./....#/....#/#...#/.###.',
    '6': '.###./#...#/#..../####./#...#/#...#/.###.',
    '7': '#####/....#/...#./..#../.#.../.#.../.#...',
    '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
    '9': '.###./#...#/#...#/.####/....#/#...#/.###.',
    ' ': '...../...../...../...../...../...../.....',
    '!': '..#../..#../..#../..#../..#../...../..#..',
    '?': '.###./#...#/....#/...#./..#../...../..#..',
    '.': '...../...../...../...../...../...../..#..',
    ',': '...../...../...../...../..#../..#../.#...',
    ':': '...../..#../..#../...../..#../..#../.....',
    '-': '...../...../...../#####/...../...../.....',
    '+': '...../..#../..#../#####/..#../..#../.....',
    '=': '...../...../#####/...../#####/...../.....',
    '/': '....#/....#/...#./..#../.#.../#..../#....',
    "'": '..#../..#../...../...../...../...../.....',
    '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
    ')': '.#.../..#../...#./...#./...#./..#../.#...',
    '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
    '<': '...#./..#../.#.../#..../.#.../..#../...#.',
    '>': '.#.../..#../...#./....#/...#./..#../.#...',
    '%': '##..#/##.#./...#./..#../.#.../.#.##/#..##'
  };

  // Turkce harfler: temel harf + ustune/altina isaret
  var DECO = {
    'Ç': { b: 'C', bot: ['..#..', '.##..'] },
    'Ş': { b: 'S', bot: ['..#..', '.##..'] },
    'Ğ': { b: 'G', top: ['.###.'] },
    'İ': { b: 'I', top: ['..#..'] },
    'Ö': { b: 'O', top: ['.#.#.'] },
    'Ü': { b: 'U', top: ['.#.#.'] },
    'Â': { b: 'A', top: ['.###.'] }
  };

  var CW = 5, CH = 7, GAP = 1;

  // ---- orantili genislik ----
  //
  // Harfler 5 piksel genisliginde sabit kalir (blok gorunum bozulmasin), ama
  // NOKTA, VIRGUL, UNLEM gibi aslinda 1-2 piksel olan isaretler de 5 piksel
  // yer kapliyordu. "3 / 5 DOSYA" ya da "1.INCI!" gibi yazilarda arada kocaman
  // bosluklar olusuyordu. Bu isaretler artik gercek genisligi kadar yer kaplar.
  var DAR = { '!': 1, '.': 1, ':': 1, "'": 1, ',': 2, '1': 3, '(': 3, ')': 3, ' ': 3 };

  // Her glifin mürekkebinin hangi sutunda basladigi/bittigi bir kez olculur;
  // dar glifler soldan hizalanarak cizilir, yoksa kendi bosluguyla gelirdi.
  var OLCU = {};
  (function olc() {
    for (var ch in G) {
      var rows = G[ch].split('/');
      var min = 99, max = -1;
      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].length; c++) {
          if (rows[r][c] === '#') { if (c < min) min = c; if (c > max) max = c; }
        }
      }
      OLCU[ch] = max < 0 ? { off: 0, w: CW } : { off: min, w: max - min + 1 };
    }
  })();

  // Bu glif ekranda kac piksel yer kaplar (bosluk haric)
  function glifW(ch) {
    var d = DECO[ch];
    if (d) return CW;                       // Turkce harfler temel harf kadar
    return DAR[ch] !== undefined ? DAR[ch] : CW;
  }

  // Dar glifler soldan hizalansin diye cizerken uygulanacak kaydirma
  function glifOff(ch) {
    if (DECO[ch] || DAR[ch] === undefined) return 0;
    return OLCU[ch] ? OLCU[ch].off : 0;
  }

  function rowsOf(ch) {
    if (G[ch]) return G[ch].split('/');
    return null;
  }

  function drawGlyph(ctx, ch, x, y, s) {
    var deco = DECO[ch];
    var base = deco ? deco.b : ch;
    var rows = rowsOf(base);
    if (!rows) return;
    x -= glifOff(ch) * s;                   // dar glifi sola cek

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        if (row[c] === '#') ctx.fillRect(x + c * s, y + r * s, s, s);
      }
    }
    if (deco && deco.top) {
      for (var i = 0; i < deco.top.length; i++) {
        var tr = deco.top[i];
        var ty = y - (deco.top.length - i + 1) * s;
        for (var tc = 0; tc < tr.length; tc++) {
          if (tr[tc] === '#') ctx.fillRect(x + tc * s, ty, s, s);
        }
      }
    }
    if (deco && deco.bot) {
      for (var j = 0; j < deco.bot.length; j++) {
        var br = deco.bot[j];
        var by = y + (CH + j) * s;
        for (var bc = 0; bc < br.length; bc++) {
          if (br[bc] === '#') ctx.fillRect(x + bc * s, by, s, s);
        }
      }
    }
  }

  function width(text, s) {
    s = s || 1;
    var str = String(text).toUpperCase();
    if (!str.length) return 0;
    var w = 0;
    for (var i = 0; i < str.length; i++) w += glifW(str[i]) + GAP;
    return (w - GAP) * s;                   // sondaki bosluk sayilmaz
  }

  /**
   * text(ctx, str, x, y, opts)
   *  opts: { color, scale, align:'left'|'center'|'right', shadow:'#rgb' }
   */
  function text(ctx, str, x, y, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    str = String(str).toUpperCase();
    var w = width(str, s);
    var sx = x;
    if (opts.align === 'center') sx = Math.round(x - w / 2);
    else if (opts.align === 'right') sx = Math.round(x - w);
    sx = Math.round(sx);
    y = Math.round(y);

    var ilerle;
    if (opts.shadow) {
      ctx.fillStyle = opts.shadow;
      ilerle = sx;
      for (var k = 0; k < str.length; k++) {
        drawGlyph(ctx, str[k], ilerle, y + s, s);
        ilerle += (glifW(str[k]) + GAP) * s;
      }
    }
    ctx.fillStyle = opts.color || '#f4f4f4';
    ilerle = sx;
    for (var i = 0; i < str.length; i++) {
      drawGlyph(ctx, str[i], ilerle, y, s);
      ilerle += (glifW(str[i]) + GAP) * s;
    }
    return w;
  }

  PP.font = { text: text, width: width, CH: CH, CW: CW, GAP: GAP };
})(window.PP = window.PP || {});
