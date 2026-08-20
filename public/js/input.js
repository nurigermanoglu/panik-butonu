/* Klavye + dokunmatik kontroller */
(function (PP) {
  'use strict';

  // 'lr'   = sol/sag (Engelden Kac)      'dpad' = 4 yon (Hafiza)
  // 'lobby'= sol/sag + BAS               'action' = tek buton
  var scheme = 'none';
  var handler = null;

  function fire(kind, value) {
    if (handler) handler(kind, value);
  }


  function begin(key) {
    if (key === 'action') { fire('press', 1); return; }
    if (key === 'left' || key === 'right') {
      // 'lr' = sadece sol/sag olan oyunlar (Engelden Kac). Basili tutma degil,
      // her basis TEK bir adim: bir serit sola / bir serit saga.
      if (scheme === 'lr' || scheme === 'dpad' || scheme === 'lobby') fire('dir', key);
      return;
    }
    if (key === 'up' || key === 'down') {
      if (scheme === 'dpad') fire('dir', key);
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
    // Tuslar birakilinca yapilacak bir sey yok: her basis tek bir adim.
    window.addEventListener('keyup', function (e) {
      if (isTyping(e)) return;
      if (KEYMAP[e.code]) e.preventDefault();
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
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  function setScheme(s) {
    if (s === scheme) return;
    scheme = s || 'none';
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
