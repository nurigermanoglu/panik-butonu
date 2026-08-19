/* Sunucu baglantisi (WebSocket) */
(function (PP) {
  'use strict';

  var socket = null;
  var handlers = {};
  var openQueue = [];

  function url() {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host;
  }

  function connect() {
    socket = new WebSocket(url());

    socket.onopen = function () {
      while (openQueue.length) socket.send(JSON.stringify(openQueue.shift()));
      emit('open', {});
    };
    socket.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg && msg.t) emit(msg.t, msg);
    };
    socket.onclose = function () { emit('close', {}); };
    socket.onerror = function () { emit('error', {}); };
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

  PP.net = { connect: connect, on: on, send: send };
})(window.PP = window.PP || {});
