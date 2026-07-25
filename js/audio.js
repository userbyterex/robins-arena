/**
 * audio.js
 * Efectos de sonido generados con osciladores (Web Audio API). Cero archivos
 * de audio que descargar o que puedan faltar al desplegar en GitHub Pages.
 */
const AudioFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep({ freq = 440, duration = 0.1, type = "square", volume = 0.15, slideTo = null }) {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration);
      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch (e) { /* audio no disponible, silenciosamente ignorar */ }
  }

  return {
    meleeSwing: () => beep({ freq: 180, duration: 0.08, type: "triangle", slideTo: 90 }),
    shoot: () => beep({ freq: 500, duration: 0.12, type: "sawtooth", slideTo: 200 }),
    hit: () => beep({ freq: 300, duration: 0.09, type: "square", slideTo: 120, volume: 0.2 }),
    death: () => beep({ freq: 220, duration: 0.4, type: "sawtooth", slideTo: 40, volume: 0.25 }),
    resume: () => { try { getCtx().resume(); } catch (e) {} },
  };
})();
