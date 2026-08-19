/* Sunucu baglantisi (WebSocket) - kopunca kendi kendine geri baglanir */
(function (PP) {
  'use strict';

  var socket = null;
  var handlers = {};
  var openQueue = [];
  var deneme = 0;            // ust uste kacinci deneme (bekleme suresi buna gore artar)
  var zamanlayici = null;
  var kapatildi = false;     // sayfa kapaniyor: artik denemeye gerek yok

  function url() {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host;
  }

  function connect() {
    if (kapatildi) return;
    clearTimeout(zamanlayici);
    try { socket = new WebSocket(url()); }
    catch (e) { tekrarDene(); return; }

    socket.onopen = function () {
      deneme = 0;
      while (openQueue.length) socket.send(JSON.stringify(openQueue.shift()));
      emit('open', {});
    };
    socket.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg && msg.t) emit(msg.t, msg);
    };
    socket.onclose = function () {
      emit('close', {});
      tekrarDene();
    };
    socket.onerror = function () { emit('error', {}); };
  }

  // Once hizli dene (yarim saniye), olmadikca arayi ac, en fazla 6 saniyede bir.
  // Sunucu yeniden basliyorsa ilk denemeler bosa gider, sabit beklemek gereksiz.
  function tekrarDene() {
    if (kapatildi) return;
    deneme++;
    var bekle = Math.min(6000, 400 * Math.pow(1.6, deneme - 1));
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(connect, bekle);
    emit('deneniyor', { deneme: deneme, bekle: bekle });
  }

  function emit(type, msg) {
    var list = handlers[type];
    if (!list) return;
    for (var i = 0; i < list.length; i++) list[i](msg);
  }

  function on(type, fn) {
    (handlers[type] = handlers[type] || []).push(fn);
  }

  function send(obj) {
    if (!socket || socket.readyState === WebSocket.CONNECTING) { openQueue.push(obj); return; }
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(obj));
  }

  function bagliMi() {
    return !!socket && socket.readyState === WebSocket.OPEN;
  }

  // Telefon uykudan/sekme arka plandan donunce hemen dene, zamanlayiciyi bekleme
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !bagliMi()) { deneme = 0; connect(); }
  });
  window.addEventListener('online', function () { if (!bagliMi()) { deneme = 0; connect(); } });
  window.addEventListener('pagehide', function () { kapatildi = true; });

  PP.net = { connect: connect, on: on, send: send, bagliMi: bagliMi };
})(window.PP = window.PP || {});
