/* Retro ses efektleri - Web Audio ile uretiliyor, dosya yok */
(function (PP) {
  'use strict';

  var ac = null;
  var muted = false;

  function ensure() {
    if (!ac) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ac = new Ctx();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, type, vol, delay) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function slide(f1, f2, dur, type, vol) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  PP.sfx = {
    unlock: ensure,
    setMuted: function (v) { muted = !!v; },
    isMuted: function () { return muted; },
    click: function () { tone(660, 0.05, 'square', 0.08); },
    tick: function () { tone(520, 0.08, 'square', 0.10); },
    go: function () { tone(880, 0.16, 'square', 0.14); },
    press: function () { tone(320 + Math.random() * 80, 0.03, 'square', 0.05); },
    win: function () {
      tone(523, 0.10, 'square', 0.13, 0);
      tone(659, 0.10, 'square', 0.13, 0.10);
      tone(784, 0.18, 'square', 0.13, 0.20);
    },
    lose: function () { slide(320, 90, 0.35, 'sawtooth', 0.11); },
    draw: function () { tone(400, 0.12, 'triangle', 0.10); tone(400, 0.12, 'triangle', 0.10, 0.16); },
    champion: function () {
      var notes = [523, 659, 784, 1046, 784, 1046];
      for (var i = 0; i < notes.length; i++) tone(notes[i], 0.14, 'square', 0.13, i * 0.13);
    },
    gameover: function () { slide(400, 80, 0.7, 'sawtooth', 0.10); }
  };
})(window.PP = window.PP || {});
