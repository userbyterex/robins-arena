/**
 * audio.js
 * Efectos de sonido generados con osciladores (Web Audio API).
 */
var AudioFX = (function () {
  var ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(opts) {
    opts = opts || {};
    var freq = opts.freq || 440;
    var duration = opts.duration || 0.1;
    var type = opts.type || "square";
    var volume = opts.volume || 0.15;
    var slideTo = opts.slideTo || null;
    try {
      var ac = getCtx();
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration);
      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch (e) {}
  }

  return {
    meleeSwing: function () { beep({ freq: 180, duration: 0.08, type: "triangle", slideTo: 90 }); },
    shoot: function () { beep({ freq: 500, duration: 0.12, type: "sawtooth", slideTo: 200 }); },
    hit: function () { beep({ freq: 300, duration: 0.09, type: "square", slideTo: 120, volume: 0.2 }); },
    death: function () { beep({ freq: 220, duration: 0.4, type: "sawtooth", slideTo: 40, volume: 0.25 }); },
    resume: function () { try { getCtx().resume(); } catch (e) {} },
  };
})();
