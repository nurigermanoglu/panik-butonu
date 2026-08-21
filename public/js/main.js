/* Ana istemci: ekran yonetimi, ag olaylari ve cizim dongusu */
(function (PP) {
  'use strict';

  var W = 320, H = 180, TOP = 22;
  var g, f, P;
  var cv, ctx;
  var state = null;
  var youId = null;
  var time = 0, last = 0;
  var prevPhase = null, prevCount = null;
  var signalSeenAt = null;   // REFLEKS: isareti ekranda GORDUGUM an (ping'i denklemden cikarir)
  var wasFouled = false;     // REFLEKS: erken basip yandigim ani yakalamak icin
  var wasBoom = false;       // SICAK PATATES: patlama anini yakalamak icin
  var ptr = { x: 0, y: 0, down: false };   // parmak/fare konumu (yerel, gecikmesiz)
  var lastDragAt = 0;
  var sonSync = 0;          // son durum paketi ne zaman geldi (baglanti kontrolu)
  var cizimHatasi = false;  // ayni hatayi tekrar tekrar yazmamak icin
  var kopuk = false;        // baglanti su an kopuk mu (ekranda perde gosterilir)
  var geriDonuyor = false;  // eski yerimize oturmayi deniyoruz

  function $(id) { return document.getElementById(id); }

  // ---------------------------------------------------------------- kurulum

  function init() {
    g = PP.gfx; f = PP.font; P = g.PAL;
    cv = $('cv');
    ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    bindMenu();
    bindNet();
    PP.input.init();
    PP.input.handler = onAction;
    PP.net.connect();

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    bindPointer();

    var hash = location.hash.replace('#', '').toUpperCase();
    if (/^[A-Z0-9]{4}$/.test(hash)) $('code').value = hash;
    var saved = localStorage.getItem('pp_name');
    if (saved) $('name').value = saved;

    resize();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function bindMenu() {
    $('btnQuick').addEventListener('click', function () {
      PP.sfx.unlock(); PP.sfx.click();
      PP.net.send({ t: 'quick', name: readName() });
    });
    $('btnCreate').addEventListener('click', function () {
      PP.sfx.unlock(); PP.sfx.click();
      PP.net.send({ t: 'create', name: readName() });
    });
    $('btnJoin').addEventListener('click', function () {
      PP.sfx.unlock(); PP.sfx.click();
      var code = $('code').value.trim().toUpperCase();
      if (code.length !== 4) return showErr('4 HARFLI KOD GIR');
      PP.net.send({ t: 'join', code: code, name: readName() });
    });
    $('code').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btnJoin').click();
    });
    $('name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btnCreate').click();
    });
    $('btnCopy').addEventListener('click', function () {
      var url = $('shareUrl').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          $('btnCopy').textContent = 'KOPYALANDI';
          setTimeout(function () { $('btnCopy').textContent = 'KOPYALA'; }, 1500);
        });
      }
    });
    // Tam ekran: tarayici cubuklarini gizler, oyun alani buyur.
    // (Cozunurlugu artirmaz - ayni kareler daha buyuk gorunur.)
    $('btnFull').addEventListener('click', function () {
      var el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        var iste = el.requestFullscreen || el.webkitRequestFullscreen;
        if (iste) iste.call(el);
      } else {
        var cik = document.exitFullscreen || document.webkitExitFullscreen;
        if (cik) cik.call(document);
      }
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        var tam = !!(document.fullscreenElement || document.webkitFullscreenElement);
        $('btnFull').textContent = tam ? 'CIK' : 'TAM EKRAN';
        setTimeout(resize, 120);
      });
    });
    // ---- ODADAN CIK ----
    // Yanlis butona basip odada sikisip kalmak mumkun olmasin.
    // Lobide/sampiyon ekraninda tek dokunus yeter; mac ortasinda ise
    // yanlislikla cikilmasin diye ikinci bir onay ister.
    $('btnLeave').addEventListener('click', function () {
      PP.sfx.unlock(); PP.sfx.click();
      var macta = state && (state.phase === 'intro' || state.phase === 'play' || state.phase === 'result');
      if (macta && performance.now() - cikisSoruldu > 3000) {
        cikisSoruldu = performance.now();
        $('btnLeave').textContent = 'EMIN MISIN?';
        $('btnLeave').classList.add('soruyor');
        setTimeout(cikisSifirla, 3000);
        return;
      }
      odadanCik();
    });

    $('btnMute').addEventListener('click', function () {
      var m = !PP.sfx.isMuted();
      PP.sfx.setMuted(m);
      $('btnMute').textContent = m ? 'SES: KAPALI' : 'SES: ACIK';
    });
  }

  // ---------------------------------------------------------------- dokunma / fare
  //
  // Dokunmatik mini oyunlar icin canvas uzerinde parmak/fare takibi.
  // Ekran koordinati -> 320x180 oyun koordinatina cevrilir ve sunucuya
  // grab (bastim) / drag (surukluyorum) / drop (biraktim) olarak gonderilir.
  // Suruklenen nesne YEREL parmak konumunda cizilir; boylece gecikme hissedilmez.

  function canvasPos(e) {
    var r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return { x: 0, y: 0 };
    return {
      x: Math.round(Math.max(0, Math.min(W, (e.clientX - r.left) / r.width * W))),
      y: Math.round(Math.max(0, Math.min(H, (e.clientY - r.top) / r.height * H)))
    };
  }

  function pointerActive() {
    return !!(state && state.phase === 'play' && state.mg && state.mg.controls === 'pointer');
  }

  function bindPointer() {
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      PP.sfx.unlock();

      if (pointerActive()) {
        ptr = canvasPos(e);
        ptr.down = true;
        lastDragAt = 0;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* yoksay */ }
        // Kostebekte bu bir cekic savurmasi, digerlerinde parca tutma
        var oyunId = state && state.mg ? state.mg.id : '';
        if (oyunId === 'mole') PP.sfx.cekic();
        else if (oyunId === 'shapesort' || oyunId === 'puzzle') PP.sfx.kaldir();
        else PP.sfx.press();
        PP.net.send({ t: 'in', a: 'grab', d: ptr });
        return;
      }
      // Tek butonlu oyunlarda (At Yarisi, Refleks, Sicak Patates) ekrana
      // tiklamak da BAS sayilir - klavyeye uzanmaya gerek yok.
      if (state && state.phase === 'play' && state.mg && state.mg.controls === 'action') {
        PP.input.press();
        return;
      }

      // Lobide sadece BUTONLAR is yapar; bos bir yere basmak hazir yapmaz.
      if (state && state.phase === 'lobby') {
        var p2 = canvasPos(e);
        var ok = karakterOklari();
        if (ok && kutuIcinde(p2, ok.sol)) { PP.sfx.tick(); PP.net.send({ t: 'char', d: -1 }); return; }
        if (ok && kutuIcinde(p2, ok.sag)) { PP.sfx.tick(); PP.net.send({ t: 'char', d: 1 }); return; }
        var ho = hedefOklari();
        if (ho && kutuIcinde(p2, ho.sol)) { PP.sfx.tick(); PP.net.send({ t: 'target', d: -1 }); return; }
        if (ho && kutuIcinde(p2, ho.sag)) { PP.sfx.tick(); PP.net.send({ t: 'target', d: 1 }); return; }
        var hb = hazirButonu();
        if (hb && kutuIcinde(p2, hb)) { PP.input.press(); return; }
        return;
      }
      if (state && state.phase === 'gameover') PP.input.press();
    });

    cv.addEventListener('pointermove', function (e) {
      // Konumu HER ZAMAN guncelle: cekic/nisangah gibi imlecler basili olmasa da
      // fareyi takip etmeli. Aga paket yollamak icin basili olmak gerekir.
      var p = canvasPos(e);
      ptr.x = p.x; ptr.y = p.y;
      if (!ptr.down || !pointerActive()) return;
      e.preventDefault();
      var now = performance.now();
      if (now - lastDragAt < 45) return;          // saniyede ~22 paket yeter
      lastDragAt = now;
      PP.net.send({ t: 'in', a: 'drag', d: { x: p.x, y: p.y } });
    });

    var birak = function (e) {
      if (!ptr.down) return;
      e.preventDefault();
      ptr.down = false;
      if (!pointerActive()) return;
      var p = canvasPos(e);
      ptr.x = p.x; ptr.y = p.y;
      PP.net.send({ t: 'in', a: 'drop', d: { x: p.x, y: p.y } });
    };
    cv.addEventListener('pointerup', birak);
    cv.addEventListener('pointercancel', birak);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function readName() {
    var n = $('name').value.trim().slice(0, 10);
    if (n) localStorage.setItem('pp_name', n);
    return n;
  }

  function showErr(msg) {
    var el = $('menuErr');
    el.textContent = msg;
    el.classList.add('shake');
    setTimeout(function () { el.classList.remove('shake'); }, 400);
  }

  // ---- oturum: hangi odada, hangi anahtarla oturuyorum ----
  // Baglanti kopunca ayni sekmenin eski yerine oturabilmesi icin saklanir.
  // sessionStorage: sekmeye ozel, sekme kapaninca silinir - baska sekme calamaz.

  function oturumYaz(code, token) {
    try { sessionStorage.setItem('pp_oturum', JSON.stringify({ code: code, token: token })); }
    catch (e) { /* gizli mod: sakli tutamiyorsak yeniden baglanma calismaz, oyun yine calisir */ }
  }
  function oturumOku() {
    try { return JSON.parse(sessionStorage.getItem('pp_oturum') || 'null'); }
    catch (e) { return null; }
  }
  function oturumSil() {
    try { sessionStorage.removeItem('pp_oturum'); } catch (e) { /* yoksay */ }
  }

  var cikisSoruldu = 0;      // "EMIN MISIN?" ne zaman soruldu

  function cikisSifirla() {
    if (performance.now() - cikisSoruldu < 3000) return;   // hala soruyoruz
    cikisSoruldu = 0;
    $('btnLeave').textContent = '← CIK';
    $('btnLeave').classList.remove('soruyor');
  }

  function odadanCik() {
    cikisSoruldu = 0;
    $('btnLeave').textContent = '← CIK';
    $('btnLeave').classList.remove('soruyor');
    PP.net.send({ t: 'leave' });     // sunucu bizi gercekten cikarir
    menuyeDon(null);
  }

  function menuyeDon(hata) {
    state = null;
    youId = null;
    kopuk = false;
    geriDonuyor = false;
    oturumSil();
    PP.muzik.sus();
    // Adresteki #KOD kalmasin: F5 bizi tekrar o odaya baglamaya calismasin
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    $('game').classList.add('hidden');
    $('menu').classList.remove('hidden');
    if (hata) showErr(hata);
  }

  function bindNet() {
    PP.net.on('joined', function (m) {
      youId = m.id;
      location.hash = m.code;
      oturumYaz(m.code, m.token);
      kopuk = false;
      geriDonuyor = false;
      $('menu').classList.add('hidden');
      $('game').classList.remove('hidden');
      // Odaga yazi kutusu/buton kalmasin: yoksa tuslar oraya gider, bosluk butonu tekrar tetikler
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      resize();
    });

    PP.net.on('err', function (m) {
      // Geri oturma denemesi reddedildiyse (oda kapandi / sure doldu) menuye dus.
      if (geriDonuyor) return menuyeDon(m.m || 'ODAYA DONULEMEDI');
      showErr(m.m || 'HATA');
    });

    // Odadan ciktiktan sonra yolda kalmis bir paket bizi tekrar oyun ekranina
    // sokmasin: menudeyken youId bos olur, o paketleri yoksay.
    PP.net.on('sync', function (m) {
      if (youId === null) return;
      state = m;
      onSync();
    });

    PP.net.on('left', function () { menuyeDon(null); });

    // Baglanti kopunca ARTIK menuye atmiyoruz: perde gosterip geri baglanmayi bekliyoruz.
    // net.js kendi kendine tekrar deniyor; basarinca asagidaki 'open' devreye girer.
    PP.net.on('close', function () {
      PP.muzik.sus();                        // sunucu yokken muzik calmaya devam etmesin
      if (!oturumOku()) return;              // zaten odada degildik
      kopuk = true;
    });

    PP.net.on('open', function () {
      var o = oturumOku();
      if (!o) return;                         // menudeyiz, donecek bir yer yok
      // DIKKAT: youId'ye BAKMIYORUZ. Sayfa F5 ile yenilendiginde youId bos olur
      // ama oturum sessionStorage'da durur - geri oturmamiz gereken an tam da odur.
      // Yoksa eski yerimiz bir sure daha tutulurken yeniden katiliyoruz ve
      // odada kendimizin iki kopyasi gorunuyor.
      geriDonuyor = true;
      PP.net.send({ t: 'resume', code: o.code, token: o.token });
    });
  }

  // ---------------------------------------------------------------- girdi

  function me() {
    if (!state) return null;
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === youId) return state.players[i];
    }
    return null;
  }

  function onAction(kind, value) {
    PP.sfx.unlock();
    if (!state) return;

    if (state.phase === 'lobby') {
      if (kind === 'dir') {                       // sadece oda kurucusunda ise yarar
        if (state.host !== youId) return;
        PP.sfx.tick();
        PP.net.send({ t: 'target', d: value === 'left' ? -1 : 1 });
        return;
      }
      if (kind !== 'press') return;
      var m = me();
      PP.sfx.click();
      PP.net.send({ t: 'ready', v: m ? !m.ready : true });
      return;
    }
    if (state.phase === 'gameover') {
      if (kind !== 'press') return;
      PP.sfx.click();
      PP.net.send({ t: 'again' });
      return;
    }
    if (state.phase !== 'play') return;

    if (kind === 'press') {
      PP.sfx.press();
      // Refleks turunda kendi olctugum tepki suresini de yolla
      var ms = signalSeenAt === null ? undefined : Math.round(performance.now() - signalSeenAt);
      PP.net.send({ t: 'in', a: 'press', d: ms });
    }
    else if (kind === 'dir') { PP.sfx.press(); PP.net.send({ t: 'in', a: 'dir', d: value }); }
  }

  function updateScheme() {
    if (!state) return PP.input.setScheme('none');
    // Lobide sol/sag oklari SADECE odayi kurana gosterilir; digerleri tek buton gorur.
    if (state.phase === 'lobby') {
      return PP.input.setScheme(state.host === youId ? 'lobby' : 'action');
    }
    if (state.phase === 'gameover') return PP.input.setScheme('action');
    PP.input.setScheme(state.mg ? state.mg.controls : 'action');
  }

  // ---------------------------------------------------------------- ses olaylari
  //
  // Sunucu "ses cal" diye bir sey yollamaz; sadece durum yollar. Burada iki
  // paket karsilastirilir ve DEGISEN sey ne ise ona uygun ses calinir.
  // Ornek: skorum 3'ten 4'e ciktiysa kostebege vurmusumdur.

  var sesOnceki = {};       // gecen paketteki degerler
  var sonNal = 0;           // at yarisi: her adimda ses calmasin diye kisitlanir

  function sesOlaylari() {
    if (state.phase !== 'play' || !state.mg || !state.st) { sesOnceki = {}; return; }
    var id = state.mg.id, st = state.st, o = sesOnceki;
    var ben = st.pl ? st.pl[youId] : null;
    var y = {};               // bu paketin degerleri (bir sonrakiyle karsilasmak icin)

    // Skor + yanip sonme kullanan oyunlar (kostebek, dosya, sekil, puzzle)
    if (ben && typeof ben.s === 'number') {
      y.s = ben.s; y.fl = ben.fl;
      var arttiMi = o.s !== undefined && ben.s > o.s;
      var kotuMu = ben.fl === 2 && o.fl !== 2;
      if (id === 'mole') { if (arttiMi) PP.sfx.vur(); if (kotuMu) PP.sfx.patla(); }
      else if (id === 'filedelete') { if (arttiMi) PP.sfx.sil(); }   // bu oyunda ceza yok
      else if (id === 'shapesort' || id === 'puzzle') { if (arttiMi) PP.sfx.otur(); if (kotuMu) PP.sfx.hata(); }
    }

    if (id === 'wirecut' && ben) {
      y.p = ben.p; y.pen = ben.pen;
      if (o.p !== undefined && ben.p > o.p) PP.sfx.kes();
      if (ben.pen > 0 && !(o.pen > 0)) PP.sfx.hata();
    }
    else if (id === 'race' && st.p) {
      y.p = st.p[youId];
      // Kisitlama gercek saatle olculur. 'time' cizim dongusunden gelir ve
      // sekme arka plandayken durur; ona baglanirsa ses hic calmaz.
      var simdi = performance.now();
      if (o.p !== undefined && y.p > o.p && simdi - sonNal > 110) { sonNal = simdi; PP.sfx.nal(); }
    }
    else if (id === 'dodge' && ben) {
      y.a = ben.a;
      if (o.a === true && ben.a === false) PP.sfx.carp();
    }
    else if (id === 'memory') {
      y.prog = st.prog ? st.prog[youId] : 0;
      y.out = st.out ? st.out[youId] : false;
      if (o.prog !== undefined && y.prog > o.prog) PP.sfx.dogru();
      if (o.out === false && y.out === true) PP.sfx.hata();
    }
    else if (id === 'hotpotato') {
      y.holder = st.holder; y.fuse = st.fuse;
      if (o.holder !== undefined && st.holder !== o.holder && !st.boom) PP.sfx.pas();
      // Fitil bitmek uzereyken tik tik: sadece bomba bendeyken
      if (st.holder === youId && st.fuse > 0 && st.fuse < 2 &&
          o.fuse !== undefined && Math.floor(st.fuse * 4) !== Math.floor(o.fuse * 4)) {
        PP.sfx.fitil();
      }
    }
    sesOnceki = y;
  }

  // Faza ve mac durumuna gore fon muzigi secer.
  function muzikAyarla() {
    if (!state) return PP.muzik.sus();
    // Duraklamis mac (biri koptu): muzik de dursun, bir sey oluyor gibi durmasin
    if (kopuk) return PP.muzik.sus();
    if (state.phase === 'lobby' || state.phase === 'gameover') return PP.muzik.calis('lobi');
    if (state.bekle) return PP.muzik.sus();      // mac duraklamis
    // Biri sampiyonluga 1 tur kala: tempo yukselsin
    var enYuksek = 0;
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].wins > enYuksek) enYuksek = state.players[i].wins;
    }
    PP.muzik.calis(enYuksek >= state.needed - 1 ? 'gerilim' : 'oyun');
  }

  function onSync() {
    sonSync = performance.now();
    updateScheme();
    sesOlaylari();
    muzikAyarla();

    // Refleks: isaretin ekranda ilk belirdigi ani yakala
    if (state.phase === 'play' && state.mg && state.mg.id === 'reflex' && state.st && state.st.sig) {
      if (signalSeenAt === null) signalSeenAt = performance.now();
    } else {
      signalSeenAt = null;
    }

    // Refleks: erken basip yandigin an sesli uyari (sessizce olmesin)
    var reflexAni = state.phase === 'play' && state.mg && state.mg.id === 'reflex' && state.st;
    var suAnYandim = !!(reflexAni && state.st.fouled && state.st.fouled[youId]);
    if (suAnYandim && !wasFouled) PP.sfx.lose();
    wasFouled = suAnYandim;

    // Sicak patates: patlama sesi
    var patlama = !!(state.phase === 'play' && state.mg && state.mg.id === 'hotpotato' &&
                     state.st && state.st.boom);
    if (patlama && !wasBoom) PP.sfx.patla();
    wasBoom = patlama;

    var shareBox = $('share');
    if (state.phase === 'lobby') {
      shareBox.classList.remove('hidden');
      $('shareUrl').textContent = location.origin + '/#' + state.code;
    } else {
      shareBox.classList.add('hidden');
    }

    if (state.phase !== prevPhase) {
      if (state.phase === 'intro') PP.sfx.click();
      else if (state.phase === 'play') PP.sfx.go();
      else if (state.phase === 'result') {
        var wins = (state.result && state.result.winners) || [];
        if (!wins.length) PP.sfx.draw();
        else if (wins.indexOf(youId) >= 0) PP.sfx.win();
        else PP.sfx.lose();
      } else if (state.phase === 'gameover') {
        if (state.winner === youId) PP.sfx.champion(); else PP.sfx.gameover();
      }
      prevPhase = state.phase;
      prevCount = null;
    }

    if (state.phase === 'intro') {
      var c = Math.ceil(state.timer);
      if (c !== prevCount) { prevCount = c; if (c > 0) PP.sfx.tick(); }
    }
  }

  // ---------------------------------------------------------------- olcek

  function resize() {
    var stage = $('stage');
    if (!stage) return;
    var r = stage.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    var scale = Math.min(r.width / W, r.height / H);
    var k = scale >= 1 ? Math.floor(scale) : scale;   // ekranda kac kat gorunecek
    cv.style.width = Math.floor(W * k) + 'px';
    cv.style.height = Math.floor(H * k) + 'px';

    // Ic cozunurluk: ekrandaki kat sayisi kadar (en fazla 3x). Boylece bir oyun
    // karesi tam olarak k ekran pikseline denk gelir -> bloklar keskin kalir,
    // resimler ise o oranda daha detayli cizilir.
    var ic = Math.max(1, Math.min(3, Math.round(k)));
    if (cv.width !== W * ic) {
      cv.width = W * ic;
      cv.height = H * ic;
    }
    // canvas boyutu degisince baglam sifirlanir: ayarlari tekrar kur
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(ic, 0, 0, ic, 0, 0);   // tum oyun kodu yine 320x180 kullanir
    PP.res.olcek = ic;
  }

  // ---------------------------------------------------------------- cizim

  // Lobide KENDI karakterimin yanindaki ok butonlarinin yerleri.
  // Hem cizim hem dokunma testi ayni yeri kullansin diye tek yerden hesaplanir.
  // ---- LOBI YERLESIMI ----
  // Sol sutun: oyuncular alt alta. Sag sutun: baslik, tur secimi, HAZIR, kod.
  // Butun konumlar tek yerden gelsin ki cizim ile dokunma alani hep ayni olsun.
  var LOBI = {
    satirY: function (slot) { return 14 + slot * 40; },   // sol sutun satir ustu
    karakterX: 28,
    yaziX: 58,
    sagX: 136, sagW: 180,
    baslik: { x: 140, y: 8, w: 172, h: 30 },
    tur:    { y: 46, h: 22 },
    hazir:  { x: 152, y: 76, w: 148, h: 30 },
    kod:    { x: 152, y: 116, w: 148, h: 28 }
  };

  // Kendi karakterini degistiren oklar - kendi satirinin iki yaninda
  function karakterOklari() {
    if (!state || state.phase !== 'lobby') return null;
    var m = me();
    if (!m) return null;
    var ust = LOBI.satirY(m.slot);
    return {
      kw: 30,
      cx: LOBI.karakterX,
      sol: { x: 2, y: ust + 8, w: 11, h: 24 },
      sag: { x: 44, y: ust + 8, w: 11, h: 24 }
    };
  }

  // Hedef tur sayisini degistiren oklar - SADECE odayi kurana gorunur/calisir
  function hedefOklari() {
    if (!state || state.phase !== 'lobby') return null;
    if (state.host !== youId) return null;
    return {
      sol: { x: LOBI.sagX + 6, y: LOBI.tur.y, w: 20, h: LOBI.tur.h },
      sag: { x: LOBI.sagX + LOBI.sagW - 26, y: LOBI.tur.y, w: 20, h: LOBI.tur.h }
    };
  }

  // Lobideki HAZIR butonu (ekranin baska yerine basmak hazir yapmaz)
  function hazirButonu() {
    if (!state || state.phase !== 'lobby') return null;
    return { x: LOBI.hazir.x, y: LOBI.hazir.y, w: LOBI.hazir.w, h: LOBI.hazir.h };
  }

  // Taslaktaki gibi: kalin siyah hatli sari kutu, icinde siyah yazi
  function sariKutu(k, yazi, olcek, vurgu) {
    g.rect(ctx, k.x, k.y, k.w, k.h, '#000000');
    g.rect(ctx, k.x + 3, k.y + 3, k.w - 6, k.h - 6, vurgu ? '#fff45c' : '#ffe100');
    if (yazi) {
      f.text(ctx, yazi, k.x + k.w / 2, k.y + Math.round((k.h - 7 * olcek) / 2), {
        color: '#000000', scale: olcek, align: 'center'
      });
    }
  }

  function kutuIcinde(p, k) {
    return p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h;
  }

  function playerById(id) {
    if (!state) return null;
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === id) return state.players[i];
    }
    return null;
  }

  function view() {
    return {
      W: W, H: H, top: TOP, time: time,
      players: state.players, you: youId,
      ptr: ptr,                     // dokunmatik oyunlar yerel parmak konumunu kullanir
      // Son durum paketinden bu yana gecen sure. Hizli hareket eden nesneler
      // (kosu pistindeki engeller) bununla suzulup 60 fps akici cizilir.
      gecikme: Math.max(0, Math.min(0.25, (performance.now() - sonSync) / 1000))
    };
  }

  function drawScorePips(y) {
    var n = state.players.length, needed = state.needed;
    var pip = 3, gap = 1, groupW = needed * (pip + gap) - gap;
    var totalW = n * groupW + (n - 1) * 5;
    var x0 = W - 4 - totalW;
    for (var i = 0; i < n; i++) {
      var p = state.players[i];
      var col = g.colorForSlot(p.slot);
      for (var k = 0; k < needed; k++) {
        var px = x0 + i * (groupW + 5) + k * (pip + gap);
        g.rect(ctx, px, y, pip, pip, k < p.wins ? col : P.dark);
      }
    }
  }

  function drawTopBar() {
    g.rect(ctx, 0, 0, W, TOP, P.black);
    if (state.mg) f.text(ctx, state.mg.name, 4, 4, { color: P.white, scale: 1 });
    drawScorePips(4);

    var pct = 1;
    if (state.phase === 'play' && state.mg) pct = Math.max(0, state.timer / state.mg.dur);
    var col = pct > 0.5 ? P.green : pct > 0.25 ? P.yellow : P.red;
    g.rect(ctx, 0, TOP - 4, W, 4, P.dark);
    g.rect(ctx, 0, TOP - 4, Math.round(W * pct), 4, col);
  }

  function drawLobby() {
    // Zemin: arkadaki tek parca mavi dama gorunsun (tuval saydam kalir)
    ctx.clearRect(0, 0, W, H);
    var ben = me();

    // ================= SOL SUTUN: oyuncular alt alta =================
    for (var s = 0; s < state.max; s++) {
      var ust = LOBI.satirY(s);
      var p = null;
      for (var j = 0; j < state.players.length; j++) {
        if (state.players[j].slot === s) p = state.players[j];
      }

      if (!p) {
        for (var d = 0; d < 34; d += 5) {
          g.rect(ctx, 12 + d, ust + 4, 3, 1, 'rgba(4,26,44,0.65)');
          g.rect(ctx, 12 + d, ust + 34, 3, 1, 'rgba(4,26,44,0.65)');
        }
        g.rect(ctx, 11, ust + 4, 1, 31, 'rgba(4,26,44,0.65)');
        g.rect(ctx, 45, ust + 4, 1, 31, 'rgba(4,26,44,0.65)');
        f.text(ctx, 'BOS', LOBI.yaziX + 4, ust + 16, {
          color: '#0a1826', scale: 1, shadow: 'rgba(255,255,255,0.9)'
        });
        continue;
      }

      var bob = Math.round(Math.sin(time * 4 + s) * 2);
      PP.chars.ciz(ctx, p.char, LOBI.karakterX, ust + 19 + bob, 34, 32);

      // Kendi satirimda karakter degistirme oklari (taslaktaki turuncu oklar)
      if (ben && p.id === ben.id) {
        var ok = karakterOklari();
        if (ok) {
          var parla = Math.floor(time * 3) % 2 === 0;
          [[ok.sol, 'left'], [ok.sag, 'right']].forEach(function (par) {
            var k = par[0];
            g.rect(ctx, k.x, k.y, k.w, k.h, '#000000');
            g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, k.h - 2, parla ? '#ffb066' : '#ff8a3c');
            g.arrow(ctx, par[1], k.x + 1, k.y + 8, 1, '#000000');
          });
        }
      }

      // Isim / durum / ping: koyu serit uzerinde. Mavi zemin orta tonlu
      // oldugu icin renkli yazi ancak kontrollu bir zeminde okunuyor.
      g.rect(ctx, LOBI.yaziX - 2, ust + 3, 74, 34, 'rgba(10,24,38,0.92)');
      g.rect(ctx, LOBI.yaziX - 2, ust + 3, 74, 1, 'rgba(255,255,255,0.3)');
      f.text(ctx, p.name, LOBI.yaziX + 2, ust + 6, { color: '#eef4fa', scale: 1 });

      var kopuk = p.on === false;
      var durum = kopuk ? ('KOPTU' + '.'.repeat(1 + Math.floor(time * 2) % 3))
                        : (p.ready ? 'HAZIR!' : 'BEKLIYOR');
      f.text(ctx, durum, LOBI.yaziX + 2, ust + 17, {
        color: kopuk ? '#ff9a8f' : (p.ready ? '#7ffcb0' : '#b9c6d4'), scale: 1
      });
      if (!kopuk && p.ping > 0) {
        f.text(ctx, p.ping + ' MS', LOBI.yaziX + 2, ust + 28, {
          color: p.ping < 80 ? '#7ffcb0' : p.ping < 200 ? '#ffd76b' : '#ff9a8f', scale: 1
        });
      }
    }

    // ================= SAG SUTUN =================
    var sagOrta = LOBI.sagX + LOBI.sagW / 2;

    // Baslik
    sariKutu(LOBI.baslik, null, 0);
    f.text(ctx, 'PARTI PANIK', sagOrta, LOBI.baslik.y + 8, {
      color: '#000000', scale: 2, align: 'center'
    });

    // Kac tur kazanan sampiyon (oklar sadece odayi kuranda)
    var turK = { x: LOBI.sagX + 30, y: LOBI.tur.y, w: LOBI.sagW - 60, h: LOBI.tur.h };
    sariKutu(turK, state.needed + ' TUR KAZANAN', 1);
    var ho = hedefOklari();
    if (ho) {
      [[ho.sol, 'left'], [ho.sag, 'right']].forEach(function (par) {
        var k = par[0];
        g.rect(ctx, k.x, k.y, k.w, k.h, '#000000');
        g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, k.h - 2, '#ff8a3c');
        g.arrow(ctx, par[1], k.x + 5, k.y + 6, 1, '#000000');
      });
    }

    // HAZIR butonu
    var hb = hazirButonu();
    var yeterli = state.players.length >= state.min;
    if (hb) {
      if (!yeterli) {
        g.rect(ctx, hb.x, hb.y, hb.w, hb.h, '#000000');
        g.rect(ctx, hb.x + 3, hb.y + 3, hb.w - 6, hb.h - 6, '#c9b45a');
        f.text(ctx, 'EN AZ ' + state.min + ' KISI', hb.x + hb.w / 2, hb.y + 12, {
          color: '#3a3200', scale: 1, align: 'center'
        });
      } else if (ben && ben.ready) {
        sariKutu(hb, 'HAZIRIM! (IPTAL)', 1, true);
      } else {
        sariKutu(hb, 'HAZIRIM', 2, Math.floor(time * 2) % 2 === 0);
      }
    }

    // Oda kodu
    sariKutu(LOBI.kod, null, 0);
    f.text(ctx, 'KOD', LOBI.kod.x + 10, LOBI.kod.y + 11, { color: '#000000', scale: 1 });
    f.text(ctx, state.code, LOBI.kod.x + LOBI.kod.w - 10, LOBI.kod.y + 7, {
      color: '#000000', scale: 2, align: 'right'
    });

    // HIZLI OYNA odasi: rakip aranidigini belli et
    if (state.acik && state.players.length < state.max) {
      f.text(ctx, 'RAKIP ARANIYOR' + '.'.repeat(1 + Math.floor(time * 2) % 3), sagOrta, 150, {
        color: '#0a1826', scale: 1, align: 'center', shadow: 'rgba(255,255,255,0.9)'
      });
    }

    if (state.notice) {
      var nw = f.width(state.notice, 1) + 12;
      g.rect(ctx, Math.round(sagOrta - nw / 2), 162, nw, 11, 'rgba(10,24,38,0.92)');
      f.text(ctx, state.notice, sagOrta, 164, { color: '#ff9a8f', scale: 1, align: 'center' });
    }
  }

  function drawIntro() {
    var pulse = Math.floor(time * 8) % 2 === 0;
    ctx.clearRect(0, 0, W, H);                            // arkadaki dama gorunsun
    ctx.save();
    ctx.globalAlpha = pulse ? 0.22 : 0.06;                // acik nabiz (karartma degil)
    g.rect(ctx, 0, 0, W, H, '#fff8eb');
    ctx.restore();

    // Oyun adi ve talimati parsomen levhada dursun
    var pw = Math.max(f.width(state.mg.name, 2), f.width(state.mg.instruction, 2)) + 24;
    g.panel(ctx, Math.round((W - pw) / 2), 26, pw, 48);
    f.text(ctx, state.mg.name, W / 2, 34, { color: '#43434f', scale: 2, align: 'center' });
    f.text(ctx, state.mg.instruction, W / 2, 56, { color: '#c04a3a', scale: 2, align: 'center' });

    var c = Math.max(0, Math.ceil(state.timer));
    if (c > 0) {
      f.text(ctx, String(c), W / 2, 92, {
        color: '#1a0c00', scale: 8, align: 'center', shadow: 'rgba(255,255,255,0.9)'
      });
    }

    // Kacinci turdayiz + oyunlar hizlandiysa bunu belli et
    if (state.tur) {
      f.text(ctx, 'TUR ' + state.tur, W / 2, 14, {
        color: '#1a0c00', scale: 1, align: 'center', shadow: 'rgba(255,255,255,0.9)'
      });
    }
    if (state.seviye > 0) {
      var yanip = Math.floor(time * 6) % 2 === 0;
      // Kirmizi yazi koyu turuncu kareye karisiyordu: kendi acik seridine oturuyor.
      var hz = 'HIZ +%' + Math.round(state.seviye * 100);
      var hw = f.width(hz, 2) + 14;
      g.rect(ctx, Math.round((W - hw) / 2), 146, hw, 18, 'rgba(10,24,38,0.92)');
      f.text(ctx, hz, W / 2, 148, {
        color: yanip ? '#ff9a8f' : '#eef4fa', scale: 2, align: 'center'
      });
    }
    drawTopBar();
  }

  function drawPlay() {
    var mg = state.mg && PP.MG[state.mg.id];
    if (mg && state.st) mg.draw(ctx, state.st, view());
    else g.rect(ctx, 0, 0, W, H, P.bg);
    drawTopBar();
  }

  function drawResult() {
    drawPlay();
    ctx.fillStyle = 'rgba(26,17,8,0.82)';       // sicak karartma
    ctx.fillRect(0, 0, W, H);

    var wins = (state.result && state.result.winners) || [];
    if (!wins.length) {
      var bw = f.width('BERABERE!', 3) + 24;
      g.panel(ctx, Math.round((W - bw) / 2), 48, bw, 26);
      f.text(ctx, 'BERABERE!', W / 2, 56, { color: '#43434f', scale: 3, align: 'center' });
    } else {
      var names = [];
      for (var i = 0; i < wins.length; i++) {
        var p = playerById(wins[i]);
        if (p) names.push(p.name);
      }
      var first = playerById(wins[0]);
      var col = first ? g.colorForSlot(first.slot) : P.white;
      var bob = Math.round(Math.sin(time * 10) * 3);
      PP.chars.ciz(ctx, first ? first.char : 0, W / 2, 46 + bob, 54, 38);
      f.text(ctx, names.join(' + '), W / 2, 66, { color: col, scale: 2, align: 'center', shadow: P.black });
      f.text(ctx, 'KAZANDI!', W / 2, 88, { color: P.white, scale: 2, align: 'center', shadow: P.black });
    }

    if (state.result && state.result.text) {
      f.text(ctx, state.result.text, W / 2, 112, { color: P.light, scale: 1, align: 'center' });
    }

    // skor tablosu
    var n = state.players.length, slotW = W / n;
    for (var k = 0; k < n; k++) {
      var pl = state.players[k];
      var cx = Math.round(slotW * k + slotW / 2);
      var c2 = g.colorForSlot(pl.slot);
      f.text(ctx, pl.name, cx, 134, { color: c2, scale: 1, align: 'center' });
      f.text(ctx, pl.wins + ' / ' + state.needed, cx, 146, { color: P.white, scale: 2, align: 'center' });
    }
  }

  function drawGameover() {
    ctx.clearRect(0, 0, W, H);                            // arkadaki dama gorunsun
    var champ = playerById(state.winner);
    var col = champ ? g.colorForSlot(champ.slot) : P.white;

    // konfeti
    for (var i = 0; i < 26; i++) {
      var seed = i * 37.7;
      var cxp = (seed * 13) % W;
      var cyp = ((time * (28 + (i % 5) * 14) + seed * 7) % (H + 20)) - 10;
      var cc = g.SLOT_COLORS[i % g.SLOT_COLORS.length];
      g.rect(ctx, cxp, cyp, 3, 3, cc);
    }

    f.text(ctx, 'SAMPIYON', W / 2, 10, {
      color: '#1a0c00', scale: 3, align: 'center', shadow: 'rgba(255,255,255,0.9)'
    });

    var bob = Math.round(Math.sin(time * 6) * 3);
    PP.chars.ciz(ctx, champ ? champ.char : 0, W / 2, 70 + bob, 92, 56);

    if (champ) {
      f.text(ctx, champ.name, W / 2, 104, {
        color: col, scale: 3, align: 'center', shadow: 'rgba(26,10,0,0.9)'
      });
    }

    var n = state.players.length, slotW = W / n;
    for (var k = 0; k < n; k++) {
      var pl = state.players[k];
      var cx = Math.round(slotW * k + slotW / 2);
      f.text(ctx, pl.name + ' ' + pl.wins, cx, 132, {
        color: g.colorForSlot(pl.slot), scale: 1, align: 'center'
      });
    }

    if (Math.floor(time * 2) % 2 === 0) {
      f.text(ctx, 'TEKRAR OYNAMAK ICIN BAS', W / 2, 158, {
        color: P.white, scale: 1, align: 'center', shadow: P.black
      });
    }
  }

  function drawConnecting() {
    g.rect(ctx, 0, 0, W, H, P.bg);
    f.text(ctx, 'BAGLANIYOR' + '.'.repeat(1 + Math.floor(time * 2) % 3), W / 2, H / 2 - 4, {
      color: P.light, scale: 2, align: 'center'
    });
  }

  // Oyunun uzerine yari saydam perde + iki satir yazi.
  // Hem "ben koptum" hem "arkadasi bekliyoruz" durumunda kullanilir.
  function perdeCiz(baslik, alt, renk) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    g.rect(ctx, 0, 0, W, H, P.black);
    ctx.restore();
    var nokta = '.'.repeat(1 + Math.floor(time * 2) % 3);
    f.text(ctx, baslik + nokta, W / 2, H / 2 - 14, {
      color: renk || P.yellow, scale: 2, align: 'center', shadow: P.black
    });
    if (alt) {
      f.text(ctx, alt, W / 2, H / 2 + 10, {
        color: P.light, scale: 1, align: 'center', shadow: P.black
      });
    }
  }

  function render() {
    if (!state) {
      // Odadaysak ve baglanti koptuysa bos ekran yerine "geri donuyoruz" de
      if (kopuk) { g.rect(ctx, 0, 0, W, H, P.bg); perdeCiz('BAGLANTI KOPTU', 'GERI BAGLANIYOR', P.red); return; }
      return drawConnecting();
    }
    var sessiz = (performance.now() - sonSync) / 1000;
    switch (state.phase) {
      case 'lobby': drawLobby(); break;
      case 'intro': drawIntro(); break;
      case 'play': drawPlay(); break;
      case 'result': drawResult(); break;
      case 'gameover': drawGameover(); break;
      default: drawConnecting();
    }

    // 1) Benim baglantim koptu
    if (kopuk) {
      perdeCiz('BAGLANTI KOPTU', 'GERI BAGLANIYOR - YERIN TUTULUYOR', P.red);
      return;
    }
    // 2) Baskasinin baglantisi koptu: mac duruyor, onu bekliyoruz
    // Perde SADECE mac sirasinda. Lobide mac zaten durmuyor; perde hem yanlis
    // bilgi verir hem de HAZIR butonunun ustunu kapatir. Lobide kopan kisi
    // kendi kutusunda "KOPTU..." yazisiyla zaten gorunuyor.
    var macSuruyor = state.phase === 'intro' || state.phase === 'play' || state.phase === 'result';
    if (state.bekle && macSuruyor) {
      perdeCiz(state.bekle.ad + ' KOPTU', 'MAC DURDU - ' + state.bekle.sn + ' SANIYE BEKLENIYOR', P.yellow);
      return;
    }

    // Sunucudan uzun suredir haber yoksa ekran donmus gibi gorunur; bunu soyle
    if (sessiz > 3) {
      g.rect(ctx, 0, TOP, W, 12, P.black);
      f.text(ctx, 'BAGLANTI YOK... ' + Math.floor(sessiz) + ' SN', W / 2, TOP + 3, {
        color: P.red, scale: 1, align: 'center'
      });
    }
  }

  function loop(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    // Sunucu paketleri arasi yumusak sayac. Mac duraklamissa (biri koptu)
    // sayaci ilerletme - yoksa ekranda sure akar ama gercekte akmaz.
    if (state && !kopuk && !state.bekle &&
        (state.phase === 'play' || state.phase === 'intro')) {
      state.timer = Math.max(0, state.timer - dt);
    }

    // Tek bir karede hata olursa oyun TAMAMEN donmasin: kareyi atla, dongu devam etsin.
    try {
      render();
      cizimHatasi = false;
    } catch (e) {
      if (!cizimHatasi) { cizimHatasi = true; console.error('cizim hatasi:', e); }
    }

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.PP = window.PP || {});
