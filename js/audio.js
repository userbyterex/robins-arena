/**
 * audio.js — Procedural SFX + procedural music (lobby & battle).
 * No external files. 100% Web Audio API.
 */

var AudioFX = (function () {
  var ctx = null;
  var music = {
    isPlaying: false,
    type: "lobby",
    bpm: 70,
    nextNoteTime: 0,
    currentStep: 0,
    scale: [220, 261.63, 293.66, 329.63, 392, 440, 523.25],
    pattern: [0, 2, 4, 2, 0, 3, 5, 3, 4, 2, 0, 2],
    timerId: null
  };

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(opts) {
    opts = opts || {};
    var freq = opts.freq || 440;
    var duration = opts.duration || 0.1;
    var type = opts.type || "square";
    var volume = opts.volume || 0.12;
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

  function scheduleMusic() {
    if (!music.isPlaying) return;
    var ac = getCtx();
    var ahead = 0.15;
    while (music.nextNoteTime < ac.currentTime + ahead) {
      playMusicNote();
      music.nextNoteTime += 60 / music.bpm / 2;
    }
    music.timerId = requestAnimationFrame(scheduleMusic);
  }

  function playMusicNote() {
    try {
      var ac = getCtx();
      var noteIdx = music.pattern[music.currentStep % music.pattern.length];
      var freq = music.scale[noteIdx % music.scale.length];

      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = music.type === "lobby" ? "triangle" : "sawtooth";
      osc.frequency.value = freq;
      var vol = music.type === "lobby" ? 0.035 : 0.025;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.25);

      var bassInterval = music.type === "lobby" ? 4 : 2;
      if (music.currentStep % bassInterval === 0) {
        var bass = ac.createOscillator();
        var bassGain = ac.createGain();
        bass.type = "sine";
        bass.frequency.value = freq / 2;
        bassGain.gain.setValueAtTime(vol * 1.5, ac.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
        bass.connect(bassGain);
        bassGain.connect(ac.destination);
        bass.start();
        bass.stop(ac.currentTime + 0.35);
      }

      if (music.type === "battle" && music.currentStep % 4 === 0) {
        playDrum(ac);
      }

      music.currentStep++;
    } catch (e) {}
  }

  function playDrum(ac) {
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(80, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.08);
    gain.gain.setValueAtTime(0.06, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.08);
  }

  function startMusic(type) {
    stopMusic();
    music.type = type;
    music.bpm = type === "lobby" ? 70 : 110;
    music.isPlaying = true;
    music.nextNoteTime = getCtx().currentTime + 0.1;
    music.currentStep = 0;
    scheduleMusic();
  }

  function stopMusic() {
    music.isPlaying = false;
    if (music.timerId) {
      cancelAnimationFrame(music.timerId);
      music.timerId = null;
    }
  }

  return {
    meleeSwing: function () { beep({ freq: 180, duration: 0.08, type: "triangle", slideTo: 90 }); },
    shoot: function () { beep({ freq: 520, duration: 0.1, type: "sawtooth", slideTo: 200 }); },
    hit: function () { beep({ freq: 320, duration: 0.09, type: "square", slideTo: 120, volume: 0.18 }); },
    death: function () { beep({ freq: 220, duration: 0.4, type: "sawtooth", slideTo: 40, volume: 0.22 }); },
    beep: beep,
    resume: function () { try { getCtx().resume(); } catch (e) {} },
    startLobbyMusic: function () { startMusic("lobby"); },
    stopLobbyMusic: function () { stopMusic(); },
    startBattleMusic: function () { startMusic("battle"); },
    stopBattleMusic: function () { stopMusic(); }
  };
})();
