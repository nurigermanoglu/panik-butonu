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
      PP.gfx.pixelArt(cv, { renk: 14, hat: '#0b0b0f' });   // fotograf -> pixel art
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

  // BASKALARININ vuruslari. Bu oyunda herkesin vurma hakki AYRI: senin
  // ekranindaki kostebekler senin vurduklarina gore kalkip iniyor, yani
  // rakiplerin ne yaptigi hicbir yerde gorunmuyordu - ustteki sayidan
  // baska. Bot oynarken "hicbir sey yapmiyor" izlenimi bundan cikiyor.
  // Burada her rakip vurusu, o oyuncunun renginde kisa bir carpma
  // pirildamasi olarak vurdugu deligin uzerinde belirir.
  var RAKIP_SURESI = 0.5;
  var rakipVurus = {};   // "oyuncuId:kostebekNo" -> { bit, h, renk, kayma }

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

      // Zemin: cakil. Vurusta yesil, bombada kirmizi parlar.
      g.doku(ctx, 0, 0, v.W, v.H, 'cakil');
      if (ben.fl) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        g.rect(ctx, 0, 0, v.W, v.H, ben.fl === 1 ? '#7ed957' : '#e05a4a');
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

      // Rakiplerin yeni vuruslarini defterime al (kendimi atlarim)
      for (var ri = 0; ri < v.players.length; ri++) {
        var rp = v.players[ri];
        if (rp.id === v.you) continue;
        var rd = st.pl[rp.id];
        if (!rd || !rd.hit) continue;
        for (var rh = 0; rh < rd.hit.length; rh++) {
          var anahtar = rp.id + ':' + rd.hit[rh];
          if (rakipVurus[anahtar] !== undefined) continue;
          // Vurulan kostebegin hangi delikte oldugunu aktif listeden bul
          var delikNo = -1;
          for (var ra = 0; ra < st.act.length; ra++) {
            if (st.act[ra].i === rd.hit[rh]) { delikNo = st.act[ra].h; break; }
          }
          if (delikNo < 0) continue;
          rakipVurus[anahtar] = {
            bit: v.time + RAKIP_SURESI, h: delikNo, renk: g.colorForSlot(rp.slot),
            // Slota gore sabit aci kaydirmasi: iki rakip ayni delige vursa bile
            // kivilcimlari ust uste binmez
            kayma: (rp.slot % 4) * (Math.PI / 12)
          };
        }
      }
      for (var rk in rakipVurus) {
        if (v.time >= rakipVurus[rk].bit) delete rakipVurus[rk];
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

      // ---- rakip vuruslari ----
      // Rakibin vurdugu delikte kisa bir CARPMA PIRILTISI: disari dogru acilan
      // ince kivilcimlar, oyuncunun renginde.
      //
      // Ilk deneme kocaman dolu bir arti isaretiydi (kollar 22 px, kalinlik 6):
      // kostebegi tamamen kapatiyordu ve iki rakip ayni delige vurdugunda
      // ust uste binip ekranda bir hata gibi duruyordu. Simdi:
      //   - cok daha kucuk ve ince, kostebek altindan gorunuyor
      //   - kollar ORTADAN degil disaridan basliyor, yani merkez acik kaliyor
      //   - her oyuncunun kivilcimlari farkli acidan cikiyor (slot kaydirmasi),
      //     boylece iki vurus ust uste binmiyor
      for (var rv in rakipVurus) {
        var rvo = rakipVurus[rv];
        var rhole = st.holes[rvo.h];
        if (!rhole) continue;
        var kalanOran = Math.max(0, Math.min(1, (rvo.bit - v.time) / RAKIP_SURESI));
        var ic = 5 + (1 - kalanOran) * 6;                   // ic yaricap: disari acilir
        var uzunluk = 4;                                     // kivilcim boyu
        var hx = Math.round(rhole.x), hy = Math.round(rhole.y - 8);
        ctx.save();
        ctx.globalAlpha = kalanOran;
        for (var s = 0; s < 6; s++) {
          // Slot kaydirmasi: farkli oyuncularin kivilcimlari ayni yere dusmesin
          var aci = (s / 6) * Math.PI * 2 + rvo.kayma;
          var dx = Math.cos(aci), dy = Math.sin(aci);
          for (var u = 0; u < uzunluk; u++) {
            var px = Math.round(hx + dx * (ic + u));
            var py = Math.round(hy + dy * (ic + u));
            g.rect(ctx, px - 1, py - 1, 3, 3, P.black);     // okunurluk icin koyu hat
          }
          for (var u2 = 0; u2 < uzunluk; u2++) {
            var px2 = Math.round(hx + dx * (ic + u2));
            var py2 = Math.round(hy + dy * (ic + u2));
            g.rect(ctx, px2, py2, 1, 1, rvo.renk);
          }
        }
        ctx.restore();
      }

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
        var skor = ' ' + (pd ? pd.s : 0);
        var isim = f.sigdir(p.name, slotW - 4 - f.width(skor, 1), 1);
        f.text(ctx, isim + skor, Math.round(slotW * m + slotW / 2), v.top + 2, {
          color: g.colorForSlot(p.slot), scale: 1, align: 'center', shadow: P.black
        });
      }

      f.text(ctx, 'BOMBAYA VURMA!', v.W / 2, v.H - 8, {
        color: P.red, scale: 1, align: 'center', shadow: P.black
      });
    }
  };
})(window.PP = window.PP || {});
