/* Klavye + dokunmatik kontroller */
(function (PP) {
  'use strict';

  var scheme = 'none';               // 'none' | 'action' | 'lr' | 'dpad'
  var held = { left: false, right: false };
  var lastMove = 0;
  var handler = null;

  function fire(kind, value) {
    if (handler) handler(kind, value);
  }

  function updateMove() {
    var d = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    if (d !== lastMove) {
      lastMove = d;
      fire('move', d);
    }
  }

  function begin(key) {
    if (key === 'action') { fire('press', 1); return; }
    if (key === 'left' || key === 'right') {
      if (scheme === 'lr') { held[key] = true; updateMove(); }
      else if (scheme === 'dpad' || scheme === 'lobby') fire('dir', key);
      return;
    }
    if (key === 'up' || key === 'down') {
      if (scheme === 'dpad') fire('dir', key);
    }
  }

  function end(key) {
    if (key === 'left' || key === 'right') {
      if (held[key]) { held[key] = false; updateMove(); }
    }
  }

  var KEYMAP = {
    Space: 'action', Enter: 'action', KeyZ: 'action', KeyX: 'action', NumpadEnter: 'action',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down'
  };

  // Yazi kutusuna yaziliyorsa tuslara karisma - yoksa isim yazarken
  // W/A/S/D/Z/X ve bosluk yutulur.
  function isTyping(e) {
    var el = e.target;
    if (!el) return false;
    var tag = (el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function bindKeyboard() {
    window.addEventListener('keydown', function (e) {
      if (isTyping(e)) return;
      var k = KEYMAP[e.code];
      if (!k) return;
      e.preventDefault();
      if (e.repeat) return;          // klavye otomatik tekrari sayilmaz
      begin(k);
    });
    window.addEventListener('keyup', function (e) {
      if (isTyping(e)) return;
      var k = KEYMAP[e.code];
      if (!k) return;
      e.preventDefault();
      end(k);
    });
    window.addEventListener('blur', function () {
      held.left = held.right = false;
      updateMove();
    });
  }

  function bindButtons() {
    var btns = document.querySelectorAll('[data-k]');
    Array.prototype.forEach.call(btns, function (btn) {
      var key = btn.getAttribute('data-k');

      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        btn.classList.add('down');
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* yoksay */ }
        begin(key);
      });
      var release = function (e) {
        e.preventDefault();
        btn.classList.remove('down');
        end(key);
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  function setScheme(s) {
    if (s === scheme) return;
    scheme = s || 'none';
    held.left = held.right = false;
    lastMove = 0;
    var pad = document.getElementById('pad');
    if (pad) pad.setAttribute('data-scheme', scheme);
  }

  function init() {
    bindKeyboard();
    bindButtons();
  }

  PP.input = {
    init: init,
    setScheme: setScheme,
    press: function () { fire('press', 1); },
    get scheme() { return scheme; },
    set handler(fn) { handler = fn; },
    get handler() { return handler; }
  };
})(window.PP = window.PP || {});
