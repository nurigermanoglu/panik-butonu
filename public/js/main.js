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
  var kopyalandiAn = -9;    // KOD kopyalandi yazisi ne zaman belirdi

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
      PP.net.send({ t: 'quick', name: readName(), cihaz: cihazAnahtari() });
    });
    $('btnCreate').addEventListener('click', function () {
      PP.sfx.unlock(); PP.sfx.click();
      PP.net.send({ t: 'create', name: readName(), cihaz: cihazAnahtari() });
    });
    $('btnJoin').addEventListener('click', function () {
      PP.sfx.unlock(); PP.sfx.click();
      var code = $('code').value.trim().toUpperCase();
      if (code.length !== 4) return showErr('4 HARFLI KOD GIR');
      PP.net.send({ t: 'join', code: code, name: readName(), cihaz: cihazAnahtari() });
    });
    $('code').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btnJoin').click();
    });
    $('name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('btnCreate').click();
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

    Array.prototype.forEach.call(document.querySelectorAll('.ebtn'), function (b) {
      b.addEventListener('click', function () {
        onAction('emote', Number(b.getAttribute('data-e')));
      });
    });

    $('btnMute').addEventListener('click', sesiDegistir);
    sesButonuTazele();

    $('chatForm').addEventListener('submit', function (e) {
      e.preventDefault();
      sohbetGonder();
    });
    // Enter ile de gonderilsin. Formun kendi davranisi bunu zaten yapar ama
    // bazi mobil klavyelerde 'Git' tusu formu gondermiyor; garantiye aliyoruz.
    $('chatMsg').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      sohbetGonder();
    });
    ['focus', 'input', 'pointerdown'].forEach(function (ev) {
      $('chatMsg').addEventListener(ev, sohbetGoster);
    });
    $('chatMsg').addEventListener('blur', sohbetGoster);   // sayaci yeniden baslatir
    $('chatLog').addEventListener('pointerdown', sohbetGoster);
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
        var bo2 = botOklari();
        if (bo2 && kutuIcinde(p2, bo2.sol)) { PP.sfx.tick(); PP.net.send({ t: 'bot', d: -1 }); return; }
        if (bo2 && kutuIcinde(p2, bo2.sag)) { PP.sfx.tick(); PP.net.send({ t: 'bot', d: 1 }); return; }
        var zb2 = zorlukButonlari();
        if (zb2) {
          for (var zj = 0; zj < zb2.length; zj++) {
            if (kutuIcinde(p2, zb2[zj])) {
              PP.sfx.tick();
              PP.net.send({ t: 'botzor', d: zb2[zj].idx });
              return;
            }
          }
        }
        var cb = cikButonu();
        if (cb && kutuIcinde(p2, cb)) { PP.sfx.click(); odadanCik(); return; }
        var kb = kodButonu();
        if (kb && kutuIcinde(p2, kb)) { kodKopyala(); return; }
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

  // ---- cihaz anahtari ----
  // Sekmeyi KAPATIP koddan tekrar giren kisiyi tanimak icin. Yukaridaki oturum
  // anahtari sessionStorage'da durur ve sekmeyle birlikte silinir; bu ise
  // localStorage'da kalir. Sunucuya sadece odaya girerken yollanir, hicbir
  // oyuncu listesinde gorunmez - yani baskasi taklit edemez.
  // (Eskiden bu esleme ISIMLE yapiliyordu: oda kodunu bilen biri kopan
  //  oyuncuyla ayni ismi yazip onun slotuna ve skoruna oturabiliyordu.)
  var cihazBellek = null;

  function rastgeleAnahtar() {
    var d = new Uint8Array(9);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(d);
    else for (var i = 0; i < d.length; i++) d[i] = Math.floor(Math.random() * 256);
    var s = '';
    for (var j = 0; j < d.length; j++) s += (d[j] + 256).toString(16).slice(1);
    return s;
  }

  function cihazAnahtari() {
    if (cihazBellek) return cihazBellek;
    try {
      cihazBellek = localStorage.getItem('pp_cihaz') || '';
      if (!cihazBellek) {
        cihazBellek = rastgeleAnahtar();
        localStorage.setItem('pp_cihaz', cihazBellek);
      }
    } catch (e) {
      // Gizli mod: saklayamiyoruz. En azindan sayfa acik kaldigi surece sabit
      // kalsin - F5 sonrasi geri oturma yine sessionStorage'daki oturumla olur.
      cihazBellek = rastgeleAnahtar();
    }
    return cihazBellek;
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

  // Ust cubuktaki hoparlor simgesi; ses kapaliyken uzerine egik cizgi gelir.
  var HOPARLOR = '<path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/>' +
    '<path d="M15 9.2a4.2 4.2 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M17.8 6.2a8.4 8.4 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  var EGIK_CIZGI = '<path d="M3.5 3.5 20.5 20.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';

  function sesSimgesi(kapali) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      HOPARLOR + (kapali ? EGIK_CIZGI : '') + '</svg>';
  }

  function sesButonuTazele() {
    var kapali = PP.sfx.isMuted();
    var b = $('btnMute');
    b.innerHTML = sesSimgesi(kapali);
    b.setAttribute('aria-label', kapali ? 'Sesi ac' : 'Sesi kapat');
    b.setAttribute('title', kapali ? 'Ses kapali' : 'Ses acik');
  }

  // Ses acma/kapama tek yerden cagirilir ki buton hep dogru simgeyi gostersin.
  function sesiDegistir() {
    PP.sfx.unlock();
    var kapali = !PP.sfx.isMuted();
    PP.sfx.setMuted(kapali);
    if (!kapali) PP.sfx.click();
    sesButonuTazele();
  }

  // Sohbet kaydi normalde gorunmez. Yeni mesaj gelince veya yazmaya
  // baslayinca belirir, bir sure sonra tekrar kaybolur.
  var SOHBET_ACIK_KAL = 3000;
  var sohbetSayaci = null;

  function sohbetGoster() {
    $('chat').classList.remove('sessiz');
    if (sohbetSayaci) clearTimeout(sohbetSayaci);
    sohbetSayaci = setTimeout(sohbetSessiz, SOHBET_ACIK_KAL);
  }

  function sohbetSessiz() {
    // Kutuda yaziyorsa veya yarim kalmis yazi varsa kaybolmasin
    var kutu = $('chatMsg');
    if (document.activeElement === kutu || kutu.value.trim()) return sohbetGoster();
    $('chat').classList.add('sessiz');
  }

  var sonSohbetMetni = '';     // sunucu reddederse kutuya geri konur

  function sohbetGonder() {
    var kutu = $('chatMsg');
    var metin = kutu.value.trim();
    if (!metin) return;
    PP.net.send({ t: 'chat', m: metin });
    sonSohbetMetni = metin;
    kutu.value = '';
  }

  // Sohbet kaydina oyuncu mesaji degil, sistem notu ekler (gri ve italik).
  function sohbetUyari(metin) {
    var kutu = $('chatLog');
    var satir = document.createElement('p');
    satir.className = 'bos';
    satir.textContent = metin;
    kutu.appendChild(satir);
    while (kutu.children.length > 60) kutu.removeChild(kutu.firstChild);
    kutu.scrollTop = kutu.scrollHeight;
    sohbetGoster();
  }

  // Bir sohbet satirini ekrana basar.
  // DIKKAT: metin HER ZAMAN textContent ile yazilir. innerHTML kullanilirsa
  // baska bir oyuncunun yazdigi metin sayfada kod olarak calisirdi.
  function sohbetEkle(m) {
    var kutu = $('chatLog');
    var dipte = kutu.scrollHeight - kutu.scrollTop - kutu.clientHeight < 24;
    var satir = document.createElement('p');
    var ad = document.createElement('span');
    ad.className = 'ad';
    ad.textContent = m.ad + ': ';
    ad.style.color = sohbetRengi(m);
    satir.appendChild(ad);
    satir.appendChild(document.createTextNode(m.m));
    kutu.appendChild(satir);
    while (kutu.children.length > 60) kutu.removeChild(kutu.firstChild);
    if (dipte) kutu.scrollTop = kutu.scrollHeight;   // okurken yukari kaydirdiysa zorlamayalim
    sohbetGoster();
  }

  // Yazan kisinin oyundaki rengi. Slot mesajin icinde geldigi icin gecmis
  // henuz oyuncu listesi gelmeden cizilse de renkler dogru olur.
  function sohbetRengi(m) {
    if (typeof m.slot === 'number') return g.colorForSlot(m.slot);
    var p = playerById(m.id);
    return p ? g.colorForSlot(p.slot) : '#9fc0dc';
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
    // Menude cikilacak bir oda yok: CIK gizlenir. TAM EKRAN ve ses dugmesi
    // ust cubukta kalir - onlar her ekranda ise yarar.
    $('btnLeave').classList.add('hidden');
    $('emotes').classList.add('hidden');
    $('chat').classList.add('hidden');
    $('arena').classList.remove('sohbetli');
    $('chatLog').innerHTML = '';
    $('chatMsg').value = '';
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

    // Sohbet: odaya girince gecmis toplu gelir, sonra tek tek.
    PP.net.on('chatlog', function (m) {
      $('chatLog').innerHTML = '';
      (m.list || []).forEach(sohbetEkle);
    });
    PP.net.on('chat', sohbetEkle);

    // Mesaj sunucuda reddedildi. Eskiden bu haber hic gelmiyordu ve mesaj
    // hicbir aciklama olmadan kayboluyordu: sebebi yazilir, metin de kutuya
    // geri konur ki yazan kisi bastan yazmak zorunda kalmasin.
    PP.net.on('chatred', function (m) {
      var kutu = $('chatMsg');
      if (!kutu.value.trim() && sonSohbetMetni) kutu.value = sonSohbetMetni;
      sohbetUyari(
        m.k === 'hizli' ? 'COK HIZLI YAZIYORSUN, BIR AN BEKLE' :
        m.k === 'bos' ? 'BOS MESAJ GONDERILEMEZ' :
        'MESAJ GONDERILEMEDI'
      );
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

    // Tepkiler mac sirasinda calisir; lobide ve sampiyon ekraninda sohbet var
    if (kind === 'emote') {
      if (state.phase === 'lobby' || state.phase === 'gameover') return;
      PP.sfx.tick();
      PP.net.send({ t: 'emote', i: value });
      return;
    }

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
    // Gerilim muzigi sunucunun ilan ettigi final turuna bagli: ekranda
    // "FINAL TURU" yazarken muzik de tempo yukseltsin.
    PP.muzik.calis(state.final ? 'gerilim' : 'oyun');
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

    // Tepki dugmeleri sadece mac sirasinda: lobide ve sampiyon ekraninda
    // sohbet zaten acik.
    var macta = state.phase === 'intro' || state.phase === 'play' || state.phase === 'result';
    $('emotes').classList.toggle('hidden', !macta);

    var lobide = state.phase === 'lobby';
    // Lobide CIK ekranin kendisinde (sari kutu) duruyor; ust cubuktaki gizlenir
    // ki ayni buton iki kez gorunmesin. SES simgesi her zaman ust cubukta kalir.
    $('btnLeave').classList.toggle('hidden', lobide);

    // Sohbet sadece lobide. Panel acilip kapaninca oyun alaninin genisligi
    // degisir, o yuzden resize() sart.
    var sohbet = $('chat');
    if (sohbet.classList.contains('hidden') === lobide) {
      sohbet.classList.toggle('hidden', !lobide);
      $('arena').classList.toggle('sohbetli', lobide);
      if (lobide) sohbet.classList.add('sessiz');   // gecmis varsa sohbetEkle gosterir
      resize();
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

  // Sohbet paneli olculeri. Tuval tam kat olceklendigi icin yaninda hep
  // artan bir bosluk kalir; panel o boslugu yutup genisler.
  var SOHBET_EN_AZ = 200, ARENA_BOSLUK = 8;

  // Tuvali olcekerken panele ayrilan pay. Bu deger KUCULURSE tuvale yer
  // acilir ve tuval bir kat buyur - yani sohbet degil oyun buyur. O yuzden
  // pay, panelin eskiden CSS'ten aldigi genislige sabitlenmistir.
  function sohbetPayi() {
    return Math.min(300, Math.max(180, window.innerWidth * 0.26));
  }

  // Tuval lobide sola yaslandigi icin tuvalin ortasi ekranin ortasi DEGIL.
  // Menu blogunu ekranin ortasina oturtmak icin eksenini her olcumde
  // yeniden hesapliyoruz. Cizim de dokunma testi de LOBI'den okudugu icin
  // ikisi otomatik ayni yerde kalir.
  function menuEkseniGuncelle() {
    var r = cv.getBoundingClientRect();
    if (!r.width) return;
    var olcek = r.width / W;
    var hedef = (window.innerWidth / 2 - r.left) / olcek;   // ekran ortasi -> tuval koordinati
    var yari = LOBI.baslik.w / 2;
    // Sola: oyuncu sutununa girmesin (sutun 67'de bitiyor, 5 px acik biraksin)
    // Saga: tuvalden tasmasin
    var orta = Math.round(Math.max(72 + yari, Math.min(W - 2 - yari, hedef)));
    LOBI.sagX = orta - yari;
    LOBI.baslik.x = orta - yari;
    LOBI.hazir.x = orta - LOBI.hazir.w / 2;
    LOBI.cik.x = orta - LOBI.cik.w / 2;
  }

  function resize() {
    var stage = $('stage');
    if (!stage) return;
    var r = stage.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;

    // Sohbet yan yanaysa tuval, panelin EN AZ payi ayrildiktan sonra kalan
    // yere gore olceklenir. Boylece panel genisledikce tuval kucule kucule
    // gitmez; ikisinin TOPLAM genisligi sabit kaldigi icin hesap kararlidir.
    var chat = $('chat');
    var yanYana = !chat.classList.contains('hidden') &&
                  window.getComputedStyle($('arena')).flexDirection === 'row';
    // Sohbet ustte duran bir katman: yer kaplamadigi icin sahne zaten
    // tum genisligi kapliyor.
    var toplamW = r.width;
    var tuvaleKalan = yanYana ? toplamW - sohbetPayi() - ARENA_BOSLUK : r.width;

    var scale = Math.min(tuvaleKalan / W, r.height / H);
    var k = scale >= 1 ? Math.floor(scale) : scale;   // ekranda kac kat gorunecek
    var tuvalW = Math.floor(W * k);
    cv.style.width = tuvalW + 'px';
    cv.style.height = Math.floor(H * k) + 'px';

    // Tuval yerlestikten sonra ARTAN yer panele gider
    if (yanYana) {
      // Panel genisligi: tuvalin sagindaki bos seride sigsin
      var hedef = Math.min(260, Math.max(180, window.innerWidth * 0.20));
      var panel = Math.min(Math.round((toplamW - tuvalW) / 2) - ARENA_BOSLUK, hedef);
      chat.style.width = Math.round(Math.max(150, panel)) + 'px';
    } else {
      chat.style.width = '';           // alt alta dizilimde CSS karar versin
    }

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

    menuEkseniGuncelle();
  }

  // ---------------------------------------------------------------- cizim

  // Lobide KENDI karakterimin yanindaki ok butonlarinin yerleri.
  // Hem cizim hem dokunma testi ayni yeri kullansin diye tek yerden hesaplanir.
  // ---- LOBI YERLESIMI ----
  // Sol sutun: oyuncular alt alta. Sag sutun: baslik, tur secimi, HAZIR, kod.
  // Butun konumlar tek yerden gelsin ki cizim ile dokunma alani hep ayni olsun.
  var LOBI = {
    // 4 satir x 45 = 180: tuvalin tamami. Her satirda karakter (34 px) ve
    // altinda isim (7 px) var; zipla payi +-1 ile birlikte tam oturur.
    satirY: function (slot) { return slot * 45; },        // sol sutun satir ustu
    karakterX: 33,                              // karakterin ORTASI (44 px genis cizilir)
    isimY: 37,                                  // isim satiri: ust + isimY
    isimEn: 66,                                 // isim karakterX'te ortalanir: 0..66
    // Blok TUVALIN ORTASINA oturur: orta = sagX + sagW/2 = 160.
    // Oklar HAZIR'in 26 px disina cizildigi icin baslik.w = hazir.w + 52 olmali.
    sagX: 78, sagW: 164,
    // Blok dikeyde de ortali: 12..166 arasi, ustte 12 altta 13 px bosluk
    baslik: { x: 78, y: 8, w: 164, h: 44 },    // buyuk "OYUN" kutusu (yazi 140 px)
    hazir:  { x: 108, y: 56, w: 104, h: 26 },  // iki yaninda turuncu oklar
    botY: 97,                                   // "BOT: n" + iki yaninda oklar
    zorY: 110,                                  // bot zorlugu: uc renkli tus
    cik:    { x: 108, y: 127, w: 104, h: 22 },
    kodY: 155,                                  // "KOD : XXXX" + kopyala tusu
    altY: 171                                   // rakip araniyor / uyari
  };

  // Bot zorlugu tuslari - SADECE odayi kurana gorunur/calisir.
  // Uc tus yan yana: kolay (yesil), orta (sari), zor (kirmizi).
  var ZORLUK = [
    { ad: 'KOLAY', renk: '#2fbf4f', isik: '#7fe89a', golge: '#1c7a33' },
    { ad: 'ORTA', renk: '#ffd34d', isik: '#ffe9a0', golge: '#c79a1e' },
    { ad: 'ZOR', renk: '#f45b69', isik: '#ff9aa4', golge: '#a82c39' }
  ];

  function zorlukButonlari() {
    if (!state || state.phase !== 'lobby') return null;
    if (state.host !== youId) return null;
    var orta = LOBI.sagX + LOBI.sagW / 2;
    var w = 46, ara = 5;
    var toplam = ZORLUK.length * w + (ZORLUK.length - 1) * ara;
    var x0 = Math.round(orta - toplam / 2);
    return ZORLUK.map(function (z, i) {
      return { x: x0 + i * (w + ara), y: LOBI.zorY, w: w, h: 13, idx: i };
    });
  }

  // Bot sayisini degistiren oklar - SADECE odayi kurana gorunur/calisir.
  // Hedef oklariyla ayni desen: yazinin iki yaninda turuncu tuslar.
  function botOklari() {
    if (!state || state.phase !== 'lobby') return null;
    if (state.host !== youId) return null;
    var orta = LOBI.sagX + LOBI.sagW / 2;
    return {
      sol: { x: Math.round(orta - 62), y: LOBI.botY - 4, w: 20, h: 15 },
      sag: { x: Math.round(orta + 42), y: LOBI.botY - 4, w: 20, h: 15 }
    };
  }

  function botSayisi() {
    if (!state) return 0;
    var n = 0;
    for (var i = 0; i < state.players.length; i++) if (state.players[i].bot) n++;
    return n;
  }

  // Kendi karakterini degistiren oklar - kendi satirinin iki yaninda
  function karakterOklari() {
    if (!state || state.phase !== 'lobby') return null;
    var m = me();
    if (!m) return null;
    var ust = LOBI.satirY(m.slot);
    return {
      kw: 30,
      cx: LOBI.karakterX,
      // Karakter 11..55 arasinda cizilir. Ok kutusu 10 px: ok sekli (9 px)
      // son sutununu siyah cerceveye tasir ama ikisi de siyah, fark etmez.
      sol: { x: 0, y: ust + 5, w: 10, h: 26 },
      sag: { x: 58, y: ust + 5, w: 10, h: 26 }
    };
  }

  // Hedef tur sayisini degistiren oklar - SADECE odayi kurana gorunur/calisir
  function hedefOklari() {
    if (!state || state.phase !== 'lobby') return null;
    if (state.host !== youId) return null;
    var h = LOBI.hazir;
    return {
      sol: { x: h.x - 26, y: h.y + 2, w: 22, h: h.h - 4 },
      sag: { x: h.x + h.w + 4, y: h.y + 2, w: 22, h: h.h - 4 }
    };
  }

  // Sag sutundaki CIK kutusu (ust cubuktaki ile ayni isi yapar; lobide oradaki
  // gizlenir ki ayni buton iki kez gorunmesin). SES artik hep ust cubukta.
  function cikButonu() {
    if (!state || state.phase !== 'lobby') return null;
    return { x: LOBI.cik.x, y: LOBI.cik.y, w: LOBI.cik.w, h: LOBI.cik.h };
  }

  // ---- KOD SATIRI ----
  // Yazi ile kopyalama simgesi tek satirda, birlikte ortalanir. Cizim de
  // dokunma alani da bu tek hesaptan gelir ki asla kaymasinlar.
  var SIMGE_W = 11, SIMGE_H = 13, SIMGE_ARA = 5;

  var KOPYALANDI = 'KOPYALANDI';

  function kodYerlesim() {
    if (!state) return null;
    var yazi = 'KOD : ' + state.code;
    // Yazi, ustundeki kutularla AYNI eksende ortalanir. Tus ise iki yazinin
    // genisinden hangisi buyukse onun disina sabitlenir; boylece yazi
    // 'KOPYALANDI' olurken tus yerinden kipirdamaz.
    var kw = Math.max(f.width(yazi, 2), f.width(KOPYALANDI, 2));
    var orta = LOBI.sagX + LOBI.sagW / 2;
    var sx = Math.round(orta + kw / 2 + SIMGE_ARA);
    return {
      yazi: yazi, orta: orta, y: LOBI.kodY, sx: sx,
      kutu: { x: Math.round(orta - kw / 2) - 5, y: LOBI.kodY - 4,
              w: sx + SIMGE_W + 3 - (Math.round(orta - kw / 2) - 5), h: SIMGE_H + 5 }
    };
  }

  function kodButonu() {
    if (!state || state.phase !== 'lobby') return null;
    var y = kodYerlesim();
    return y ? y.kutu : null;
  }

  // Ust uste binmis iki sayfa: kopyala simgesi. Koseler kirpilarak yuvarlatilir.
  function sayfa(x, y, w, h, hat, ic) {
    g.rect(ctx, x + 1, y, w - 2, h, hat);
    g.rect(ctx, x, y + 1, w, h - 2, hat);
    g.rect(ctx, x + 2, y + 1, w - 4, h - 2, ic);
    g.rect(ctx, x + 1, y + 2, w - 2, h - 4, ic);
  }
  function kopyaSimgesi(x, y, hat) {
    sayfa(x, y + 3, 8, 10, hat, '#ffffff');       // arkadaki sayfa
    sayfa(x + 3, y, 8, 10, hat, '#ffffff');       // ondeki sayfa (arkayi kapatir)
  }

  // Odaya davet baglantisini panoya kopyalar
  function kodKopyala() {
    if (!state) return;
    PP.sfx.click();
    var url = location.origin + '/#' + state.code;
    function tamam() { kopyalandiAn = time; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(tamam, function () {
        if (eskiUsulKopyala(url)) tamam();
      });
    } else if (eskiUsulKopyala(url)) {
      tamam();
    }
  }

  // Guvensiz baglantida (http) navigator.clipboard yoktur; gizli kutu ile kopyalanir
  function eskiUsulKopyala(metin) {
    try {
      var ta = document.createElement('textarea');
      ta.value = metin;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  // Lobideki HAZIR butonu (ekranin baska yerine basmak hazir yapmaz)
  function hazirButonu() {
    if (!state || state.phase !== 'lobby') return null;
    return { x: LOBI.hazir.x, y: LOBI.hazir.y, w: LOBI.hazir.w, h: LOBI.hazir.h };
  }

  // Kose kirpmalari: ust satirdan asagi dogru kac piksel iceri alinacagi.
  // Sivri kose yerine yumusak bir kavis verir.
  var KOSE_DIS = [3, 1, 1];
  var KOSE_IC = [2, 1];

  function yumusakKutu(x, y, w, h, renk, kose) {
    for (var i = 0; i < kose.length; i++) {
      var k = kose[i];
      g.rect(ctx, x + k, y + i, w - k * 2, 1, renk);              // ust kose satiri
      g.rect(ctx, x + k, y + h - 1 - i, w - k * 2, 1, renk);      // alt kose satiri
    }
    var n = kose.length;
    g.rect(ctx, x, y + n, w, h - n * 2, renk);                    // govde
  }

  // Taslaktaki gibi: kalin siyah hatli sari kutu, icinde siyah yazi
  // Kutuyu damali zeminden ayiran yumusak golge. Gri degil, zeminin kendi
  // mavisinin koyusu: desen uzerinde leke gibi durmasin.
  var KUTU_GOLGE = 'rgba(4,32,56,0.32)';

  // Duz renk yerine ustte isik altta golge: kutu dumduz degil, basilabilir
  // bir tus gibi dursun.
  function kabartma(ix, iy, iw, ih, ana, isik, golge) {
    yumusakKutu(ix, iy, iw, ih, ana, KOSE_IC);
    g.rect(ctx, ix + 2, iy, iw - 4, 2, isik);                // ust kenar isigi
    g.rect(ctx, ix + 2, iy + ih - 2, iw - 4, 2, golge);       // alt kenar golgesi
  }

  function sariKutu(k, yazi, olcek, vurgu) {
    yumusakKutu(k.x + 2, k.y + 3, k.w, k.h, KUTU_GOLGE, KOSE_DIS);
    yumusakKutu(k.x, k.y, k.w, k.h, '#000000', KOSE_DIS);
    kabartma(k.x + 3, k.y + 3, k.w - 6, k.h - 6,
             vurgu ? '#fff45c' : '#ffe100',
             vurgu ? '#fffcc4' : '#fff59b',
             vurgu ? '#e6c92e' : '#d8a800');
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

  // Ust cubuktaki puan gostergesi.
  // Derece puaninda hedef 15'e kadar cikabiliyor; her puan icin bir kare
  // cizmek artik sigmiyor. Onun yerine dolum cubugu + puan sayisi.
  function drawScoreBars(y) {
    var n = state.players.length;
    var hedef = state.hedef || state.needed || 1;
    var barW = 24, yaziW = 14, ara = 4;
    var birim = barW + 2 + yaziW;
    var x0 = W - 4 - (n * birim + (n - 1) * ara);
    for (var i = 0; i < n; i++) {
      var p = state.players[i];
      var col = g.colorForSlot(p.slot);
      var bx = x0 + i * (birim + ara);
      var oran = Math.max(0, Math.min(1, p.wins / hedef));
      g.rect(ctx, bx, y, barW, 5, P.dark);
      if (oran > 0) g.rect(ctx, bx, y, Math.max(1, Math.round(barW * oran)), 5, col);
      f.text(ctx, String(p.wins), bx + barW + 2, y - 1, { color: col, scale: 1 });
    }
  }

  function drawTopBar() {
    g.rect(ctx, 0, 0, W, TOP, P.black);
    if (state.mg) f.text(ctx, state.mg.name, 4, 4, { color: P.white, scale: 1 });
    drawScoreBars(4);

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
    var HALE = 'rgba(255,255,255,0.9)';

    // ================= SOL SUTUN: oyuncular alt alta =================
    for (var s = 0; s < state.max; s++) {
      var ust = LOBI.satirY(s);
      var p = null;
      for (var j = 0; j < state.players.length; j++) {
        if (state.players[j].slot === s) p = state.players[j];
      }

      if (!p) {
        var bsol = LOBI.karakterX - 22, bsag = LOBI.karakterX + 22;
        for (var d = 0; d < 44; d += 5) {
          g.rect(ctx, bsol + 1 + d, ust + 2, 3, 1, 'rgba(4,26,44,0.6)');
          g.rect(ctx, bsol + 1 + d, ust + 33, 3, 1, 'rgba(4,26,44,0.6)');
        }
        g.rect(ctx, bsol, ust + 2, 1, 32, 'rgba(4,26,44,0.6)');
        g.rect(ctx, bsag, ust + 2, 1, 32, 'rgba(4,26,44,0.6)');
        f.text(ctx, 'BOS', LOBI.karakterX, ust + LOBI.isimY, {
          color: '#0a1826', scale: 1, align: 'center', shadow: HALE
        });
        continue;
      }

      // Zipla payi +-1: satir yuksekligi 45 px ve altta isim var, +-2 olsa
      // en alt noktada isme deger.
      var bob = Math.round(Math.sin(time * 4 + s));
      PP.chars.ciz(ctx, p.char, LOBI.karakterX, ust + 18 + bob, 44, 34);

      // Kendi satirimda karakter degistirme oklari
      if (ben && p.id === ben.id) {
        var ok = karakterOklari();
        if (ok) {
          var parla = Math.floor(time * 3) % 2 === 0;
          [[ok.sol, 'left'], [ok.sag, 'right']].forEach(function (par) {
            var k = par[0];
            g.rect(ctx, k.x, k.y, k.w, k.h, '#000000');
            var ta = parla ? '#ffb066' : '#ff8a3c';
            g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, k.h - 2, ta);
            g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, 1, parla ? '#ffd0a0' : '#ffab74');
            g.rect(ctx, k.x + 1, k.y + k.h - 2, k.w - 2, 1, parla ? '#d97a30' : '#c9601f');
            g.arrow(ctx, par[1], k.x + 1, k.y + 8, 1, '#000000');
          });
        }
      }

      // Durum rozeti: karakterin sag ust kosesinde kucuk renkli kare.
      // Yazi yerine renk kullaniyoruz cunku isim satiri artik alttaki tek satir.
      var kopukMu = p.on === false;
      var yanip = Math.floor(time * 2) % 2 === 0;
      // Bot: mavi rozet. Hazir/kopuk durumu botlar icin anlamsiz.
      var rozet = p.bot ? '#49b4ff'
                        : kopukMu ? (yanip ? '#ff4d3d' : '#a02316')
                                  : (p.ready ? '#2fbf4f' : '#dfe9f2');
      g.rect(ctx, LOBI.karakterX + 15, ust + 1, 7, 7, '#000000');
      g.rect(ctx, LOBI.karakterX + 16, ust + 2, 5, 5, rozet);

      // Isim karakterin ALTINDA, karakterle ayni eksende ortali.
      // Koyu yazi + beyaz hale mavi damada okunuyor; renk durumu da anlatir.
      f.text(ctx, f.sigdir(p.name, LOBI.isimEn, 1), LOBI.karakterX, ust + LOBI.isimY, {
        color: kopukMu ? '#6b0d00' : (p.ready ? '#063b1c' : '#0a1826'),
        scale: 1, align: 'center', shadow: HALE
      });
    }

    // ================= SAG SUTUN (taslaktaki sira) =================
    var sagOrta = LOBI.sagX + LOBI.sagW / 2;

    // 1) Baslik kutusu
    sariKutu(LOBI.baslik, null, 0);
    f.text(ctx, 'OYUN', sagOrta, LOBI.baslik.y + 7, {
      color: '#000000', scale: 5, align: 'center'
    });

    // 2) HAZIR - iki yaninda turuncu oklar (tur sayisini degistirirler)
    var hb = hazirButonu();
    var yeterli = state.players.length >= state.min;
    if (hb) {
      if (!yeterli) {
        yumusakKutu(hb.x + 2, hb.y + 3, hb.w, hb.h, KUTU_GOLGE, KOSE_DIS);
        yumusakKutu(hb.x, hb.y, hb.w, hb.h, '#000000', KOSE_DIS);
        kabartma(hb.x + 3, hb.y + 3, hb.w - 6, hb.h - 6, '#cfa93c', '#e6c46a', '#a8801f');
        f.text(ctx, 'EN AZ ' + state.min + ' KISI', hb.x + hb.w / 2, hb.y + 11, {
          color: '#402d00', scale: 1, align: 'center'
        });
      } else if (ben && ben.ready) {
        sariKutu(hb, 'HAZIR (IPTAL)', 1, true);
      } else {
        sariKutu(hb, 'HAZIR', 3, Math.floor(time * 2) % 2 === 0);
      }
    }
    var ho = hedefOklari();
    if (ho) {
      [[ho.sol, 'left'], [ho.sag, 'right']].forEach(function (par) {
        var k = par[0];
        g.rect(ctx, k.x, k.y, k.w, k.h, '#000000');
        g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, k.h - 2, '#ff8a3c');
        g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, 1, '#ffab74');
        g.rect(ctx, k.x + 1, k.y + k.h - 2, k.w - 2, 1, '#c9601f');
        g.arrow(ctx, par[1], k.x + 6, k.y + 8, 1, '#000000');
      });
    }
    // Oklarin ne yaptigi belli olsun
    f.text(ctx, 'HEDEF: ' + (state.hedef || state.needed) + ' PUAN',
      sagOrta, LOBI.hazir.y + LOBI.hazir.h + 2, {
      color: '#0a1826', scale: 1, align: 'center', shadow: HALE
    });

    // 3) BOT sayisi - odayi kuran ekleyip cikarabilir
    var bo = botOklari();
    if (bo) {
      [[bo.sol, 'left'], [bo.sag, 'right']].forEach(function (par) {
        var k = par[0];
        g.rect(ctx, k.x, k.y, k.w, k.h, '#000000');
        g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, k.h - 2, '#ff8a3c');
        g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, 1, '#ffab74');
        g.rect(ctx, k.x + 1, k.y + k.h - 2, k.w - 2, 1, '#c9601f');
        g.arrow(ctx, par[1], k.x + 5, k.y + 3, 1, '#000000');
      });
    }
    f.text(ctx, 'BOT: ' + botSayisi(), sagOrta, LOBI.botY, {
      color: '#0a1826', scale: 1, align: 'center', shadow: HALE
    });

    // 3b) Bot zorlugu - uc renkli tus, secili olan parlak ve cerceveli
    var zb = zorlukButonlari();
    if (zb) {
      var secili = state.botZor === undefined ? 1 : state.botZor;
      for (var zi = 0; zi < zb.length; zi++) {
        var k = zb[zi], z = ZORLUK[zi], aktif = zi === secili;
        g.rect(ctx, k.x, k.y, k.w, k.h, '#000000');
        if (aktif) {
          g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, k.h - 2, z.renk);
          g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, 1, z.isik);
          g.rect(ctx, k.x + 1, k.y + k.h - 2, k.w - 2, 1, z.golge);
        } else {
          // Secili olmayanlar soluk: hangisinin acik oldugu bir bakista belli
          ctx.save();
          ctx.globalAlpha = 0.42;
          g.rect(ctx, k.x + 1, k.y + 1, k.w - 2, k.h - 2, z.renk);
          ctx.restore();
        }
        f.text(ctx, z.ad, k.x + k.w / 2, k.y + 3, {
          color: aktif ? '#0a1826' : 'rgba(10,24,38,0.55)', scale: 1, align: 'center'
        });
      }
    }

    // 4) CIK  (SES ust cubuktaki hoparlor simgesinde)
    sariKutu(LOBI.cik, 'CIK', 2);


    // 5) KOD - yaninda kopyalama simgesi; satirin tamamina basilabilir
    var ky = kodYerlesim();
    var yeniKopya = time - kopyalandiAn < 1.4;
    f.text(ctx, yeniKopya ? KOPYALANDI : ky.yazi, ky.orta, ky.y, {
      color: '#0a1826', scale: 2, align: 'center', shadow: HALE
    });
    kopyaSimgesi(ky.sx, ky.y, '#0a1826');            // tus her zaman gorunur

    if (state.acik && state.players.length < state.max) {
      f.text(ctx, 'RAKIP ARANIYOR' + '.'.repeat(1 + Math.floor(time * 2) % 3), sagOrta, LOBI.altY, {
        color: '#0a1826', scale: 1, align: 'center', shadow: HALE
      });
    }
    if (state.notice) {
      var nw = f.width(state.notice, 1) + 12;
      g.rect(ctx, Math.round(sagOrta - nw / 2), LOBI.altY - 2, nw, 11, 'rgba(10,24,38,0.92)');
      f.text(ctx, state.notice, sagOrta, LOBI.altY, { color: '#ff9a8f', scale: 1, align: 'center' });
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

    // Ust satir: normalde kacinci turda oldugumuz, final turunda ise
    // yanip sonen uyari. Ikisi ayni yeri kullanir - ekranin ortasi geri
    // sayim rakaminin, oraya serit koymak uzerine biniyordu.
    if (state.final) {
      var fp = Math.floor(time * 6) % 2 === 0;
      var ft = 'FINAL TURU - PUANLAR X2';
      var fw = f.width(ft, 2) + 16;
      g.rect(ctx, Math.round((W - fw) / 2), 4, fw, 20, fp ? '#c04a3a' : '#7d2b20');
      g.rect(ctx, Math.round((W - fw) / 2), 4, fw, 1, fp ? '#e0705c' : '#c04a3a');
      f.text(ctx, ft, W / 2, 7, {
        color: fp ? '#fff45c' : P.yellow, scale: 2, align: 'center'
      });
    } else if (state.tur) {
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
    drawEmotes();
  }

  // ---- mac ici tepkiler ----
  // Sunucudaki EMOTE_COUNT ile ayni sirada olmali.
  var EMOTE = ['👍', '😂', '😱', '😎'];

  // Her mini oyunun kendi duzeni oldugu icin balonlar ORTAK bir yere cizilir:
  // ust cubugun hemen altina, oyuncu slotuna gore. Iki saniye sonra dusuyorlar,
  // o yuzden altlarindaki icerigi kisa sure kapatmalari sorun degil.
  function drawEmotes() {
    if (!state.emote) return;
    var n = state.players.length, slotW = W / n;
    for (var i = 0; i < n; i++) {
      var p = state.players[i];
      var e = state.emote[p.id];
      if (e === undefined || e === null) continue;
      var sim = EMOTE[e];
      if (!sim) continue;

      var cx = Math.round(slotW * i + slotW / 2);
      var by = TOP + 3, bw = 28, bh = 17;
      var bx = Math.round(cx - bw / 2);
      // Konusma balonu: siyah hat + beyaz dolgu + alt kuyruk
      g.rect(ctx, bx, by, bw, bh, '#000000');
      g.rect(ctx, bx + 1, by + 1, bw - 2, bh - 2, '#fbfaff');
      g.rect(ctx, cx - 3, by + bh, 6, 3, '#000000');
      g.rect(ctx, cx - 2, by + bh, 4, 2, '#fbfaff');
      f.text(ctx, sim, cx, by + 3, { scale: 1.4, align: 'center' });
    }
  }

  function drawPlay() {
    var mg = state.mg && PP.MG[state.mg.id];
    if (mg && state.st) mg.draw(ctx, state.st, view());
    else g.rect(ctx, 0, 0, W, H, P.bg);
    drawTopBar();
    drawEmotes();
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
    // Puanlar neden iki kat arttiysa sebebi ekranda kalsin
    if (state.final) {
      f.text(ctx, 'FINAL TURU - PUANLAR X2', W / 2, 122, {
        color: P.yellow, scale: 1, align: 'center', shadow: P.black
      });
    }

    // skor tablosu
    var n = state.players.length, slotW = W / n;
    for (var k = 0; k < n; k++) {
      var pl = state.players[k];
      var cx = Math.round(slotW * k + slotW / 2);
      var c2 = g.colorForSlot(pl.slot);
      f.text(ctx, f.sigdir(pl.name, slotW - 4, 1), cx, 134, { color: c2, scale: 1, align: 'center' });
      f.text(ctx, pl.wins + ' / ' + (state.hedef || state.needed), cx, 146,
        { color: P.white, scale: 2, align: 'center' });
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
      var skor = ' ' + pl.wins;
      f.text(ctx, f.sigdir(pl.name, slotW - 4 - f.width(skor, 1), 1) + skor, cx, 132, {
        color: g.colorForSlot(pl.slot), scale: 1, align: 'center'
      });
    }

    drawIstat();

    if (Math.floor(time * 2) % 2 === 0) {
      f.text(ctx, 'TEKRAR OYNAMAK ICIN BAS', W / 2, 166, {
        color: P.white, scale: 1, align: 'center', shadow: P.black
      });
    }
  }

  // ---- mac sonu istatistikleri ----
  // Sunucu hazir satirlar gonderir (kim, ne, ne kadar). Hepsi ayni anda
  // ekrana sigmadigi icin 2.6 saniyede bir siradaki satira geciyoruz.
  var ISTAT_SURE = 2.6;

  function drawIstat() {
    var liste = state.istat;
    if (!liste || !liste.length) return;

    var it = liste[Math.floor(time / ISTAT_SURE) % liste.length];
    var y = 142;

    // Koyu serit: konfetinin ustunde yazi okunakli kalsin
    g.rect(ctx, 0, y - 3, W, 20, 'rgba(10,24,38,0.92)');

    f.text(ctx, it.ad, W / 2, y, { color: P.yellow, scale: 1, align: 'center' });

    var alt = it.deger ? it.kim + ' - ' + it.deger : it.kim;
    f.text(ctx, f.sigdir(alt, W - 8, 1), W / 2, y + 9, {
      color: P.white, scale: 1, align: 'center'
    });

    // Birden fazla satir varsa hangisinde oldugumuzu gosteren noktalar
    if (liste.length > 1) {
      var sira = Math.floor(time / ISTAT_SURE) % liste.length;
      var np = 3, gap = 3, toplam = liste.length * np + (liste.length - 1) * gap;
      var px = Math.round((W - toplam) / 2);
      for (var i = 0; i < liste.length; i++) {
        g.rect(ctx, px + i * (np + gap), y + 20, np, np, i === sira ? P.yellow : P.dark);
      }
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
