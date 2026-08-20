/* KOSTEBEK AVI - ekran cizimi (gercek kostebek ve bomba resimleriyle) */
(function (PP) {
  'use strict';
  var g = PP.gfx, f = PP.font, P = g.PAL;

  // Resimler: kirp = resmin icindeki cizimin kutusu (olculdu), w/h = oyunda cizilecek boyut
  // tut = resmin hangi noktasi parmagin ucuna gelecek (0-1 arasi oran)
  var KAYNAK = {
    kostebek: { src: 'img/kostebek.png', kirp: { x: 54, y: 38, w: 227, h: 240 }, w: 40, h: 42 },
    // cekic yiyince gosterilen sersemlemis hali
    kostebekVur: { src: 'img/kostebek_vur.png', kirp: { x: 38, y: 26, w: 244, h: 252 }, w: 42, h: 44 },
    bomba: { src: 'img/bomba.png', kirp: { x: 62, y: 69, w: 483, h: 383 }, w: 46, h: 37 },
    // cekicin BASI vurdugu yer oldugu icin tutma noktasi bas hizasinda
    cekic: {
      src: 'img/cekic.png', kirp: { x: 0, y: 0, w: 1357, h: 2066 },
      w: 30, h: 46, tut: { x: 0.36, y: 0.22 }
    },
    // vurus aninda yildiz patlamasi darbe noktasinda olmali
    cekicVur: {
      src: 'img/cekic_vur.png', kirp: { x: 16, y: 34, w: 402, h: 231 },
      w: 48, h: 28, tut: { x: 0.34, y: 0.62 }
    }
  };

  var img = {}, yuklendi = {}, onbellek = {};
  Object.keys(KAYNAK).forEach(function (ad) {
    yuklendi[ad] = false;
    onbellek[ad] = null;
    var im = new Image();
    im.onload = function () { yuklendi[ad] = true; };
    im.src = KAYNAK[ad].src;
    img[ad] = im;
  });

  // Resmi hedef boyuta BIR KEZ yumusak kucultup saklar (dither bulaniklasmaz,
  // her karede yeniden olcekleme yapilmaz).
  function hazir(ad) {
    if (!yuklendi[ad]) return null;
    var ic = (PP.res && PP.res.olcek) || 1;      // ekranda kac kat gorunuyorsa o kadar detay
    var anahtar = ad + '@' + ic;
    if (!onbellek[anahtar]) {
      var k = KAYNAK[ad];
      var cv = document.createElement('canvas');
      cv.width = k.w * ic; cv.height = k.h * ic;
      var c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in c2) c2.imageSmoothingQuality = 'high';
      c2.drawImage(img[ad], k.kirp.x, k.kirp.y, k.kirp.w, k.kirp.h, 0, 0, k.w * ic, k.h * ic);
      onbellek[anahtar] = cv;
    }
    return onbellek[anahtar];
  }

  // Elips: y0..y1 verilirse sadece o dikey aralik cizilir (delik agzi/on dudak icin)
  function elips(ctx, cx, cy, rx, ry, renk, y0, y1) {
    for (var dy = -ry; dy <= ry; dy++) {
      var y = cy + dy;
      if (y0 !== undefined && (y < y0 || y > y1)) continue;
      var t = dy / ry;
      var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      if (hw <= 0) continue;
      g.rect(ctx, cx - hw, y, hw * 2, 1, renk);
    }
  }

  // Vurus gorseli, tus birakildiktan sonra da kisa sure ekranda kalir.
  // Yoksa hizli tiklamada bir kare gorunup kayboluyor ve vurdugun anlasilmiyor.
  var VURUS_SURESI = 0.15;
  var vurusBitis = -1;

  // Vurulan kostebek hemen kaybolmasin: kisa sure sersemlemis hali gorunsun.
  var VURULAN_SURESI = 0.45;
  var vurulanlar = {};   // kostebek no -> gosterim bitis ani

  var TOPRAK_DIS = '#4a3729';    // yigi̇nin en dis halkasi
  var TOPRAK_ORTA = '#634833';
  var TOPRAK_UST = '#7a5a3e';    // isik alan ust yuzey
  var TOPRAK_ISIK = '#8f6b4a';
  var DELIK_IC = '#0a0b12';

  function delikArka(ctx, h) {
    elips(ctx, h.x, h.y + 4, 29, 14, TOPRAK_DIS);      // toprak yigini
    elips(ctx, h.x, h.y + 3, 27, 12, TOPRAK_ORTA);
    elips(ctx, h.x, h.y + 1, 25, 10, TOPRAK_UST);      // ustu daha acik
    elips(ctx, h.x, h.y, 23, 8, DELIK_IC);             // delik agzi
    elips(ctx, h.x, h.y - 1, 20, 6, '#000000');        // ic golge
  }

  function delikOn(ctx, h) {
    // Yiginin ON yarisi kostebegin ustune biner -> delikten cikiyor gibi durur
    elips(ctx, h.x, h.y + 4, 29, 14, TOPRAK_DIS, h.y + 5, h.y + 18);
    elips(ctx, h.x, h.y + 3, 27, 12, TOPRAK_ORTA, h.y + 5, h.y + 15);
    elips(ctx, h.x, h.y + 2, 25, 10, TOPRAK_UST, h.y + 5, h.y + 12);
    g.rect(ctx, h.x - 14, h.y + 5, 28, 1, TOPRAK_ISIK);   // on kenar isigi
    g.rect(ctx, h.x - 20, h.y + 9, 2, 1, TOPRAK_ISIK);    // toprak taneleri
    g.rect(ctx, h.x + 15, h.y + 8, 2, 1, TOPRAK_ISIK);
    g.rect(ctx, h.x - 6, h.y + 12, 3, 1, '#3a2b20');
  }

  PP.MG = PP.MG || {};
  PP.MG.mole = {
    draw: function (ctx, st, v) {
      var ben = st.pl[v.you] || { s: 0, hit: [], fl: 0 };

      // Zemin: cim tarla. Vurusta yesil, bombada kirmizi parlar.
      g.doku(ctx, 0, 0, v.W, v.H, 'cim');
      if (ben.fl) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        g.rect(ctx, 0, 0, v.W, v.H, ben.fl === 1 ? '#9bd45a' : '#c0503f');
        ctx.restore();
      }

      // Vurulanlari zaman damgasiyla isaretle; artik listede olmayanlari unut
      for (var vk = 0; vk < ben.hit.length; vk++) {
        if (vurulanlar[ben.hit[vk]] === undefined) {
          vurulanlar[ben.hit[vk]] = v.time + VURULAN_SURESI;
        }
      }
      for (var vn in vurulanlar) {
        if (ben.hit.indexOf(+vn) < 0) delete vurulanlar[vn];
      }

      var i, h;
      // ---- delikler (arka) ----
      for (i = 0; i < st.holes.length; i++) delikArka(ctx, st.holes[i]);

      // ---- kostebekler / bombalar ----
      for (var k = 0; k < st.act.length; k++) {
        var a = st.act[k];
        var hole = st.holes[a.h];
        var vuruldu = ben.hit.indexOf(a.i) >= 0;
        if (vuruldu) {
          // Sersemlemis kostebek: kisa sure gorunur, sonra kaybolur
          var bit = vurulanlar[a.i];
          if (a.bomb || bit === undefined || v.time >= bit) continue;
          var vk2 = KAYNAK.kostebekVur;
          var vres = hazir('kostebekVur');
          var sars = Math.round(Math.sin(v.time * 40) * 1.5);   // sersemleme titremesi
          var vx = Math.round(hole.x - vk2.w / 2) + sars;
          var vy = Math.round(hole.y + 8 - vk2.h);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, v.W, hole.y + 6);
          ctx.clip();
          if (vres) ctx.drawImage(vres, vx, vy, vk2.w, vk2.h);
          ctx.restore();
          continue;
        }
        var ad = a.bomb ? 'bomba' : 'kostebek';
        var kk = KAYNAK[ad];
        var res = hazir(ad);
        // r=1 tam disarida, r=0 tamamen delik icinde (gorunmez)
        var bat = Math.round((1 - a.r) * kk.h);
        var dx = Math.round(hole.x - kk.w / 2);
        var dy = Math.round(hole.y + 8 - kk.h + bat);

        // Delik agzinin ALTINA hicbir sey tasmasin: kostebek bu cizginin ustunde
        // kalan kismiyla cizilir. Boylece inip cikarken toprak icinden gecmis gibi
        // gorunmez, gercekten delige giriyor gibi olur.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, v.W, hole.y + 6);
        ctx.clip();
        if (res) {
          ctx.drawImage(res, dx, dy, kk.w, kk.h);
        } else {
          g.rect(ctx, dx + 6, dy, kk.w - 12, kk.h, a.bomb ? P.dark : '#8a5a3b');
        }
        ctx.restore();
      }

      // ---- deliklerin on dudagi ----
      for (i = 0; i < st.holes.length; i++) delikOn(ctx, st.holes[i]);

      // ---- cekic (normalde duz, vururken yildiz patlamali) ----
      if (v.ptr) {
        if (v.ptr.down) vurusBitis = v.time + VURUS_SURESI;
        var vurusModu = v.time < vurusBitis;
        var ad2 = vurusModu ? 'cekicVur' : 'cekic';
        var ck = KAYNAK[ad2];
        var cres = hazir(ad2);
        var cx2 = Math.round(v.ptr.x - ck.w * ck.tut.x);
        var cy2 = Math.round(v.ptr.y - ck.h * ck.tut.y);
        if (cres) ctx.drawImage(cres, cx2, cy2, ck.w, ck.h);
        else g.rect(ctx, v.ptr.x - 4, v.ptr.y - 4, 8, 8, P.yellow);
      }

      // ---- skorlar ----
      var n = v.players.length, slotW = v.W / n;
      for (var m = 0; m < n; m++) {
        var p = v.players[m];
        var pd = st.pl[p.id];
        f.text(ctx, p.name + ' ' + (pd ? pd.s : 0), Math.round(slotW * m + slotW / 2), v.top + 2, {
          color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
        });
      }

      f.text(ctx, 'BOMBAYA VURMA!', v.W / 2, v.H - 8, {
        color: P.red, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
