/* Retro ses - hepsi Web Audio ile uretiliyor, tek bir ses dosyasi yok.
 *
 *   PP.sfx.<efekt>()      kisa efektler (vurus, patlama, kesme...)
 *   PP.muzik.calis(mod)   fon muzigi: 'lobi' | 'oyun' | 'gerilim'
 *   PP.muzik.sus()
 *
 * Muzik da elle yazilmis bir dizi: 16 adimlik dongu, her adimda bas + arp notasi.
 * Boylece oyun hala tek bir indirme (dosya yok) ama sessiz degil.
 */
(function (PP) {
  'use strict';

  var ac = null;
  var muted = false;
  var anaGain = null;      // her sey buradan gecer: susturma tek noktadan
  var sfxGain = null;
  var muzikGain = null;
  var gurultuBuf = null;

  function ensure() {
    if (!ac) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ac = new Ctx();
      anaGain = ac.createGain();
      anaGain.gain.value = 1;
      anaGain.connect(ac.destination);

      sfxGain = ac.createGain();
      sfxGain.gain.value = 1;
      sfxGain.connect(anaGain);

      muzikGain = ac.createGain();
      muzikGain.gain.value = 0.0001;      // muzik efektlerin altinda kalsin
      muzikGain.connect(anaGain);
    }
    // resume() bir soz dondurur ve baglam kapanmissa reddeder.
    // Yakalanmazsa konsola hata dusurur; sesin olmamasi oyunu durdurmamali.
    if (ac.state === 'suspended') {
      try {
        var s = ac.resume();
        if (s && s.catch) s.catch(function () { /* ses acilamadi, sessiz devam */ });
      } catch (e) { /* yoksay */ }
    }
    return ac;
  }

  // Beyaz gurultu bir kez uretilir; patlama/kesme/adim seslerinde tekrar kullanilir
  function gurultu() {
    var c = ensure();
    if (!c) return null;
    if (!gurultuBuf) {
      var n = Math.floor(c.sampleRate * 0.5);
      gurultuBuf = c.createBuffer(1, n, c.sampleRate);
      var d = gurultuBuf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return gurultuBuf;
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
    osc.connect(gain).connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function slide(f1, f2, dur, type, vol, delay) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Gurultu patlamasi: tip='alcak' bogurtu, 'yuksek' tislama
  function patlat(dur, vol, kesim, kesimSon, delay) {
    if (muted) return;
    var c = ensure();
    var buf = gurultu();
    if (!c || !buf) return;
    var t0 = c.currentTime + (delay || 0);
    var src = c.createBufferSource();
    src.buffer = buf;
    var filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(kesim, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(60, kesimSon), t0 + dur);
    var gain = c.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(gain).connect(sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ------------------------------------------------------------------ MUZIK
  //
  // 16 adimlik dongu. Her mod kendi akor dizisini ve temposunu getirir.
  // Notalar yarim ses araliginda sayilarla tutulur (0 = do).

  var MODLAR = {
    // Lobi: yavas, sakin, bekleme muzigi
    lobi: {
      bpm: 96, arpVol: 0.055, basVol: 0.075, hatVol: 0.0,
      akorlar: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-3, 0, 4]],
      arpDesen: [0, 1, 2, 1, 0, 2, 1, 2]
    },
    // Oyun: hizli, itekleyen
    oyun: {
      bpm: 148, arpVol: 0.05, basVol: 0.08, hatVol: 0.03,
      akorlar: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-2, 3, 7]],
      arpDesen: [0, 2, 1, 2, 0, 1, 2, 1]
    },
    // Son tur / sampiyon adayı: daha gergin
    gerilim: {
      bpm: 168, arpVol: 0.055, basVol: 0.085, hatVol: 0.04,
      akorlar: [[0, 3, 6], [-1, 2, 5], [0, 3, 6], [-3, 1, 4]],
      arpDesen: [0, 2, 1, 2, 2, 1, 0, 2]
    }
  };

  var mod = null;          // su anki mod adi
  var adim = 0;
  var sonrakiAn = 0;       // bir sonraki adimin calacagi an (AudioContext saati)
  var zamanlayici = null;
  var TEMEL = 220;         // la

  function frek(yariSes) { return TEMEL * Math.pow(2, yariSes / 12); }

  function muzikNota(freq, dur, type, vol, t0, kaydir) {
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (kaydir) osc.frequency.exponentialRampToValueAtTime(freq * kaydir, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(muzikGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function muzikHat(t0, vol) {
    var buf = gurultu();
    if (!buf) return;
    var src = ac.createBufferSource();
    src.buffer = buf;
    var filt = ac.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 6000;
    var gain = ac.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    src.connect(filt).connect(gain).connect(muzikGain);
    src.start(t0);
    src.stop(t0 + 0.08);
  }

  function adimCal(m, n, t0) {
    var akor = m.akorlar[Math.floor(n / 4) % m.akorlar.length];
    // bas: her vurusta kok nota, bir oktav asagida
    if (n % 4 === 0) {
      muzikNota(frek(akor[0] - 12), 0.26, 'triangle', m.basVol, t0);
    }
    // arp: her adimda akordan bir nota
    var derece = m.arpDesen[n % m.arpDesen.length];
    muzikNota(frek(akor[derece % akor.length] + 12), 0.14, 'square', m.arpVol, t0);
    // ritim
    if (m.hatVol > 0 && n % 2 === 1) muzikHat(t0, m.hatVol);
  }

  function planla() {
    if (!ac || !mod) return;
    var m = MODLAR[mod];
    var adimSuresi = 60 / m.bpm / 2;          // 8'lik nota
    // Onumuzdeki 150 ms icindeki adimlari simdiden planla (tarayici takilsa
    // bile muzik aksamaz; setInterval'in kendisi hassas degil)
    while (sonrakiAn < ac.currentTime + 0.15) {
      if (sonrakiAn < ac.currentTime) sonrakiAn = ac.currentTime + 0.02;
      adimCal(m, adim, sonrakiAn);
      adim = (adim + 1) % 16;
      sonrakiAn += adimSuresi;
    }
  }

  function calis(yeniMod) {
    if (muted) { mod = yeniMod; return; }
    var c = ensure();
    if (!c || !MODLAR[yeniMod]) return;
    if (mod === yeniMod && zamanlayici) return;    // zaten caliyor
    var yenidenBasla = mod !== yeniMod;
    mod = yeniMod;
    if (yenidenBasla) { adim = 0; sonrakiAn = c.currentTime + 0.05; }
    muzikGain.gain.cancelScheduledValues(c.currentTime);
    muzikGain.gain.setValueAtTime(Math.max(0.0001, muzikGain.gain.value), c.currentTime);
    // 0.22 = efektlerin altinda kalan fon seviyesi. Daha yuksegi muzigi
    // one cikariyor ve vurus/patlama sesleri kayboluyor (olculdu).
    muzikGain.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.5);
    if (!zamanlayici) zamanlayici = setInterval(planla, 30);
    planla();
  }

  function sus(hizli) {
    if (!ac) { mod = null; return; }
    muzikGain.gain.cancelScheduledValues(ac.currentTime);
    muzikGain.gain.setValueAtTime(Math.max(0.0001, muzikGain.gain.value), ac.currentTime);
    muzikGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (hizli ? 0.08 : 0.4));
    clearInterval(zamanlayici);
    zamanlayici = null;
    mod = null;
  }

  // ------------------------------------------------------------------ EFEKTLER

  PP.sfx = {
    unlock: ensure,
    setMuted: function (v) {
      muted = !!v;
      if (muted) sus(true);
    },
    isMuted: function () { return muted; },

    // --- arayuz ---
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
    gameover: function () { slide(400, 80, 0.7, 'sawtooth', 0.10); },

    // --- KOSTEBEK AVI ---
    cekic: function () { patlat(0.07, 0.06, 3000, 700); },              // savurma
    vur: function () {                                                   // tam isabet
      patlat(0.10, 0.22, 1200, 180);
      tone(180, 0.09, 'square', 0.10);
      tone(720, 0.05, 'square', 0.07, 0.02);
    },

    // --- SICAK PATATES ---
    pas: function () { slide(300, 700, 0.10, 'square', 0.07); },        // bombayi verdim
    patla: function () {                                                 // BUUM
      patlat(0.55, 0.42, 1800, 60);
      slide(180, 40, 0.45, 'sawtooth', 0.14);
    },
    fitil: function () { tone(1200, 0.02, 'square', 0.035); },          // tik tik

    // --- DOSYA SILME ---
    sil: function () { slide(760, 300, 0.09, 'square', 0.07); },

    // --- KABLO KES ---
    kes: function () {
      patlat(0.06, 0.16, 5000, 1500);
      tone(1400, 0.04, 'square', 0.07);
    },

    // --- SEKIL / PUZZLE ---
    otur: function () {                                                  // parca yerine oturdu
      tone(587, 0.06, 'square', 0.09);
      tone(880, 0.09, 'square', 0.09, 0.055);
    },
    kaldir: function () { tone(440, 0.04, 'triangle', 0.06); },         // parcayi tuttum

    // --- AT YARISI ---
    nal: function () { patlat(0.05, 0.09, 900, 240); },                 // toynak

    // --- ENGELDEN KAC ---
    carp: function () {                                                  // engele tosladim
      patlat(0.22, 0.26, 1500, 120);
      slide(260, 70, 0.28, 'sawtooth', 0.12);
    },

    // --- ortak ---
    hata: function () { tone(150, 0.16, 'sawtooth', 0.10); },           // yanlis yaptim
    dogru: function () { tone(880, 0.07, 'square', 0.09); }
  };

  PP.muzik = { calis: calis, sus: sus, modu: function () { return mod; } };
})(window.PP = window.PP || {});
