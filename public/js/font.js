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
    var w = 0, i;
    if (atlas) {
      for (i = 0; i < str.length; i++) w += atlasW(str[i]) + GAP;
    } else {
      for (i = 0; i < str.length; i++) w += glifW(str[i]) + GAP;
    }
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

    var ciz = atlas ? atlasCiz : drawGlyph;
    var enW = atlas ? atlasW : glifW;

    var ilerle;
    if (opts.shadow) {
      ctx.fillStyle = opts.shadow;
      ilerle = sx;
      for (var k = 0; k < str.length; k++) {
        ciz(ctx, str[k], ilerle, y + s, s);
        ilerle += (enW(str[k]) + GAP) * s;
      }
    }
    ctx.fillStyle = opts.color || '#f4f4f4';
    ilerle = sx;
    for (var i = 0; i < str.length; i++) {
      ciz(ctx, str[i], ilerle, y, s);
      ilerle += (enW(str[i]) + GAP) * s;
    }
    return w;
  }

  // ==================================================================
  //  PIXELIFY SANS -> PIXEL BITMAP
  //
  //  Canvas'in fillText'i yaziyi HER ZAMAN yumusatir (olculdu: 76-92 farkli
  //  saydamlik seviyesi). Pixel bir oyunda bu bulanik gorunur ve kapatilamaz.
  //  Bu yuzden font acilista BIR KEZ, karakter karakter cizilip 1-bit bitmap'e
  //  cevriliyor: yariyi gecen pikseller dolu, digerleri bos. Sonrasinda cizim
  //  eski yontemle (fillRect) yapiliyor - yani her olcekte tamamen keskin.
  //
  //  Font yuklenemezse asagidaki elle cizilmis 5x7 font devrede kalir.
  // ==================================================================

  var TEMEL_BOY = 10;        // Pixelify Sans bu boyutta 7 piksel harf yuksekligi verir
  var ESIK = 110;            // bu saydamligin uzeri "dolu piksel" sayilir
  var atlas = null;          // { ch: { rows:[...], w, yOff } }
  var atlasCH = CH;

  var KARAKTERLER =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'ÇĞİÖŞÜ' +
    '0123456789' + " .,:!?/+-%()<>'=*" ;

  function atlasKur() {
    if (!document.createElement) return false;
    var yuk = 24, base = 16;                 // taban cizgisi
    var cv = document.createElement('canvas');
    var c = cv.getContext('2d', { willReadFrequently: true });
    if (!c) return false;

    var gecici = {};
    var enUstMurekkep = 999;

    for (var i = 0; i < KARAKTERLER.length; i++) {
      var ch = KARAKTERLER[i];
      c.font = TEMEL_BOY + 'px "PixelOyun"';
      var ilerleme = Math.max(1, Math.round(c.measureText(ch).width));
      var gen = ilerleme + 4;
      cv.width = gen; cv.height = yuk;       // boyut degisince baglam sifirlanir
      c.font = TEMEL_BOY + 'px "PixelOyun"';
      c.textBaseline = 'alphabetic';
      c.fillStyle = '#fff';
      c.clearRect(0, 0, gen, yuk);
      c.fillText(ch, 1, base);

      var d = c.getImageData(0, 0, gen, yuk).data;
      var izgara = [], ustu = -1, altu = -1, solu = 999, sagu = -1;
      for (var y = 0; y < yuk; y++) {
        var sat = '';
        for (var x = 0; x < gen; x++) {
          var dolu = d[(y * gen + x) * 4 + 3] >= ESIK;
          sat += dolu ? '#' : '.';
          if (dolu) {
            if (ustu < 0) ustu = y;
            altu = y;
            if (x < solu) solu = x;
            if (x > sagu) sagu = x;
          }
        }
        izgara.push(sat);
      }
      if (ustu < 0) { gecici[ch] = { bos: true, w: ilerleme }; continue; }
      if (ustu < enUstMurekkep) enUstMurekkep = ustu;
      gecici[ch] = { izgara: izgara, ust: ustu, alt: altu, sol: solu, sag: sagu, w: ilerleme };
    }

    // Hicbir harf cizilmediyse font yuklenmemis demektir
    var cizilen = 0;
    for (var k in gecici) if (!gecici[k].bos) cizilen++;
    if (cizilen < 20) return false;

    // Butun glifler ayni ust cizgiye gore hizalanir; A harfinin yuksekligi
    // hucre yuksekligi (CH) olur - eski fontla ayni: 7 piksel.
    var A = gecici['A'];
    atlasCH = A && !A.bos ? (A.alt - A.ust + 1) : CH;

    atlas = {};
    for (var ch2 in gecici) {
      var g = gecici[ch2];
      if (g.bos) { atlas[ch2] = { rows: [], w: g.w, yOff: 0 }; continue; }
      var rows = [];
      for (var r = g.ust; r <= g.alt; r++) {
        rows.push(g.izgara[r].slice(g.sol, g.sag + 1));
      }
      atlas[ch2] = {
        rows: rows,
        w: Math.max(g.sag - g.sol + 1, g.w),   // ilerleme murekkepten dar olmasin
        sol: g.sol,
        yOff: g.ust - enUstMurekkep,           // ortak ust cizgiye gore kayma
      };
    }
    return true;
  }

  function atlasCiz(ctx, ch, x, y, s) {
    var g = atlas[ch];
    if (!g || !g.rows.length) return;
    var ty = y + g.yOff * s;
    for (var r = 0; r < g.rows.length; r++) {
      var row = g.rows[r];
      for (var c2 = 0; c2 < row.length; c2++) {
        if (row[c2] === '#') ctx.fillRect(x + c2 * s, ty + r * s, s, s);
      }
    }
  }

  function atlasW(ch) {
    var g = atlas[ch];
    return g ? g.w : TEMEL_BOY / 2;
  }

  // Font hazir olunca atlasi kur; olmazsa elle cizilmis font devrede kalir.
  if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
    document.fonts.load(TEMEL_BOY + 'px "PixelOyun"', KARAKTERLER)
      .then(function () {
        try { if (!atlasKur()) atlas = null; }
        catch (e) { atlas = null; }
      })
      .catch(function () { atlas = null; });
  }

  PP.font = {
    text: text,
    width: width,
    get CH() { return atlas ? atlasCH : CH; },
    CW: CW,
    GAP: GAP,
    atlasHazir: function () { return !!atlas; }
  };
})(window.PP = window.PP || {});
