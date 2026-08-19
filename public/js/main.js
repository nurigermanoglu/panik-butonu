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
    else if (kind === 'move') PP.net.send({ t: 'in', a: 'move', d: value });
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
      y.a = ben.a; y.z = ben.z;
      if (o.a === true && ben.a === false) PP.sfx.carp();
      if (o.z !== undefined && o.z < 0 && ben.z >= 0) PP.sfx.zipla();
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
  function karakterOklari() {
    if (!state || state.phase !== 'lobby') return null;
    var m = me();
    if (!m) return null;
    var slotW = W / state.max;
    var cx = Math.round(slotW * m.slot + slotW / 2);
    var kw = Math.min(56, Math.max(28, slotW - 46));    // karakter kutusu genisligi
    var ic = Math.round(kw / 2) + 2;                    // ok kutusunun ic kenari
    return {
      kw: kw,
      cx: cx,
      sol: { x: cx - ic - 20, y: 86, w: 20, h: 26 },
      sag: { x: cx + ic, y: 86, w: 20, h: 26 }
    };
  }

  // Hedef tur sayisini degistiren oklar - SADECE odayi kurana gorunur/calisir
  function hedefOklari() {
    if (!state || state.phase !== 'lobby') return null;
    if (state.host !== youId) return null;
    return {
      sol: { x: 64, y: 141, w: 22, h: 14 },
      sag: { x: 234, y: 141, w: 22, h: 14 }
    };
  }

  // Lobideki HAZIR butonu (ekranin baska yerine basmak artik hazir yapmaz)
  function hazirButonu() {
    if (!state || state.phase !== 'lobby') return null;
    return { x: 100, y: 159, w: 120, h: 18 };
  }

  function butonCiz(k, yazi, renk, yaziRenk, kenar) {
    g.frame(ctx, k.x, k.y, k.w, k.h, renk, kenar || P.black);
    f.text(ctx, yazi, k.x + k.w / 2, k.y + Math.round((k.h - 7) / 2), {
      color: yaziRenk, scale: 1, align: 'center'
    });
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
    g.rect(ctx, 0, 0, W, H, P.bg);
    for (var i = 0; i < W; i += 16) {
      g.rect(ctx, i, 0, 8, H, '#1e2035');
    }

    f.text(ctx, 'PARTI PANIK', W / 2, 8, { color: P.yellow, scale: 3, align: 'center', shadow: P.black });
    f.text(ctx, 'ODA KODU', W / 2, 36, { color: P.light, scale: 1, align: 'center' });
    f.text(ctx, state.code, W / 2, 46, { color: P.white, scale: 4, align: 'center', shadow: P.purple });

    var max = state.max;
    var slotW = W / max;
    var full = state.players.length >= max;
    f.text(ctx, state.players.length + ' / ' + max + ' OYUNCU', W / 2, 76, {
      color: full ? P.green : P.light, scale: 1, align: 'center'
    });
    // HIZLI OYNA odasi: yabancilar da katilabilir, arandigini belli et
    if (state.acik && !full) {
      var nokta = '.'.repeat(1 + Math.floor(time * 2) % 3);
      f.text(ctx, 'HERKESE ACIK - RAKIP ARANIYOR' + nokta, W / 2, 66, {
        color: P.yellow, scale: 1, align: 'center'
      });
    }
    for (var s = 0; s < max; s++) {
      var cx = Math.round(slotW * s + slotW / 2);
      var p = null;
      for (var j = 0; j < state.players.length; j++) {
        if (state.players[j].slot === s) p = state.players[j];
      }
      if (p) {
        var col = g.colorForSlot(s);
        var bob = Math.round(Math.sin(time * 4 + s) * 2);
        var benimSlot = p.id === youId;
        var ok = benimSlot ? karakterOklari() : null;
        var kutuW = ok ? ok.kw : Math.min(56, Math.max(28, slotW - 46));

        PP.chars.ciz(ctx, p.char, cx, 99 + bob, kutuW, 28);

        // Kendi karakterimin yaninda degistirme oklari
        if (ok) {
          var parla = Math.floor(time * 3) % 2 === 0;
          [[ok.sol, 'left'], [ok.sag, 'right']].forEach(function (par) {
            var k = par[0];
            g.frame(ctx, k.x + 1, k.y + 3, k.w - 2, k.h - 6, P.dark, parla ? P.white : P.gray);
            g.arrow(ctx, par[1], k.x + 1, k.y + 4, 2, P.yellow);
          });
        }

        f.text(ctx, p.name, cx, 115, { color: col, scale: 1, align: 'center' });
        if (p.on === false) {
          // Kopuk oyuncu: yeri duruyor, geri gelmesi bekleniyor
          f.text(ctx, 'KOPTU' + '.'.repeat(1 + Math.floor(time * 2) % 3), cx, 125, {
            color: P.red, scale: 1, align: 'center'
          });
          continue;
        }
        f.text(ctx, p.ready ? 'HAZIR!' : 'BEKLIYOR', cx, 125, {
          color: p.ready ? P.green : P.gray, scale: 1, align: 'center'
        });
        if (p.ping > 0) {
          var pc = p.ping < 80 ? P.green : p.ping < 200 ? P.yellow : P.orange;
          f.text(ctx, p.ping + ' MS', cx, 134, { color: pc, scale: 1, align: 'center' });
        }
      } else {
        for (var d = 0; d < 24; d += 4) {
          g.rect(ctx, cx - 12 + d, 88, 2, 2, P.dark);
          g.rect(ctx, cx - 12 + d, 108, 2, 2, P.dark);
        }
        f.text(ctx, 'BOS', cx, 115, { color: P.dark, scale: 1, align: 'center' });
      }
    }

    // ---- hedef tur sayisi (oklar SADECE odayi kuranda calisir) ----
    var amHost = state.host === youId;
    var ho = hedefOklari();
    f.text(ctx, state.needed + ' TUR KAZANAN SAMPIYON', W / 2, 145, {
      color: amHost ? P.yellow : P.gray, scale: 1, align: 'center'
    });
    if (ho) {
      [[ho.sol, 'left'], [ho.sag, 'right']].forEach(function (par) {
        var k = par[0];
        g.frame(ctx, k.x, k.y, k.w, k.h, P.dark, P.gray);
        g.arrow(ctx, par[1], k.x + 7, k.y + 3, 1, P.yellow);
      });
    }

    // ---- HAZIR butonu (baska yere basmak hazir yapmaz) ----
    var hb = hazirButonu();
    var ben = me();
    var yeterli = state.players.length >= state.min;
    if (hb) {
      if (!yeterli) {
        butonCiz(hb, 'EN AZ ' + state.min + ' KISI GEREK', P.dark, P.gray, P.dark);
      } else if (ben && ben.ready) {
        butonCiz(hb, 'HAZIRIM! (IPTAL)', P.green, P.black, P.white);
      } else {
        var yanip = Math.floor(time * 2) % 2 === 0;
        butonCiz(hb, 'HAZIRIM', P.yellow, P.black, yanip ? P.white : P.orange);
      }
    }

    if (state.notice) {
      f.text(ctx, state.notice, W / 2, 24, { color: P.red, scale: 1, align: 'center' });
    }
  }

  function drawIntro() {
    var pulse = Math.floor(time * 8) % 2 === 0;
    g.rect(ctx, 0, 0, W, H, pulse ? P.bg2 : P.bg);

    f.text(ctx, state.mg.name, W / 2, 34, { color: P.white, scale: 2, align: 'center', shadow: P.black });
    f.text(ctx, state.mg.instruction, W / 2, 58, { color: P.yellow, scale: 2, align: 'center', shadow: P.black });

    var c = Math.max(0, Math.ceil(state.timer));
    if (c > 0) {
      f.text(ctx, String(c), W / 2, 92, { color: P.orange, scale: 8, align: 'center', shadow: P.black });
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
    ctx.fillStyle = 'rgba(13,14,26,0.80)';
    ctx.fillRect(0, 0, W, H);

    var wins = (state.result && state.result.winners) || [];
    if (!wins.length) {
      f.text(ctx, 'BERABERE!', W / 2, 56, { color: P.yellow, scale: 3, align: 'center', shadow: P.black });
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
    g.rect(ctx, 0, 0, W, H, P.bg);
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

    f.text(ctx, 'SAMPIYON', W / 2, 10, { color: P.yellow, scale: 3, align: 'center', shadow: P.black });

    var bob = Math.round(Math.sin(time * 6) * 3);
    PP.chars.ciz(ctx, champ ? champ.char : 0, W / 2, 70 + bob, 92, 56);

    if (champ) {
      f.text(ctx, champ.name, W / 2, 104, { color: col, scale: 3, align: 'center', shadow: P.black });
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
