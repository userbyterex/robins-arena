/**
 * main.js — Entry point, lobby flow, game lifecycle.
 * Viral-ready: share codes, onboarding, smooth transitions.
 */

(function () {
  "use strict";

  var selectedClass = "warrior";
  var appearance = { skin: "#f5d0b0", hair: "#5d4037", cloth: "#c0392b" };
  var isHost = false;
  var isSolo = false;
  var localPlayerConfig = null;
  var roster = [];
  var roomCode = null;
  var gameRunning = false;

  function $(id) { return document.getElementById(id); }

  function showPanel(id) {
    ["panel-setup", "panel-join", "panel-lobby"].forEach(function (pid) {
      var el = $(pid);
      if (!el) return;
      if (pid === id) { el.classList.add("active"); }
      else { el.classList.remove("active"); }
    });
  }

  function initCharacterCreator() {
    if (typeof PixelCharacter === "undefined" || !PixelCharacter.getDefaultColors) return;
    var defaults = PixelCharacter.getDefaultColors();
    var categories = ["skin", "hair", "cloth"];
    categories.forEach(function (cat, idx) {
      var row = $(cat + "-row");
      if (!row) return;
      var colors = defaults[idx] || [];
      colors.forEach(function (color, cidx) {
        var btn = document.createElement("button");
        btn.className = "color-btn" + (cidx === 0 ? " active" : "");
        btn.style.background = color;
        btn.setAttribute("aria-label", cat + " color");
        btn.addEventListener("click", function () {
          appearance[cat] = color;
          row.querySelectorAll(".color-btn").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          updatePreview();
        });
        row.appendChild(btn);
      });
    });
    updatePreview();
  }

  function updatePreview() {
    var box = $("char-preview");
    if (!box || typeof PixelCharacter === "undefined" || !PixelCharacter.generateCanvas) return;
    box.innerHTML = "";
    var cvs = PixelCharacter.generateCanvas({
      skin: appearance.skin,
      hair: appearance.hair,
      cloth: appearance.cloth,
      width: 64,
      height: 64
    });
    box.appendChild(cvs);
  }

  function initClassPicker() {
    var grid = $("class-grid");
    if (!grid) return;
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".class-card");
      if (!card) return;
      grid.querySelectorAll(".class-card").forEach(function (c) {
        c.classList.remove("selected");
        c.setAttribute("aria-pressed", "false");
      });
      card.classList.add("selected");
      card.setAttribute("aria-pressed", "true");
      selectedClass = card.getAttribute("data-class");
      AudioFX.resume();
      AudioFX.beep({ freq: 600, duration: 0.06, type: "sine", volume: 0.08 });
    });
  }

  function getName() {
    var n = $("player-name").value.trim();
    if (!n) n = "Hunter" + Math.floor(Math.random() * 999);
    return n.substring(0, 12);
  }

  function updateRosterUI() {
    var list = $("player-roster");
    if (!list) return;
    list.innerHTML = "";
    roster.forEach(function (p) {
      var li = document.createElement("li");
      if (p.isYou) li.classList.add("you");
      var icon = document.createElement("span");
      icon.className = "class-icon-small";
      icon.textContent = p.classId === "warrior" ? "⚔️" : p.classId === "ranger" ? "🏹" : p.classId === "mage" ? "🔮" : "🥋";
      li.appendChild(icon);
      li.appendChild(document.createTextNode(" " + p.name + (p.isYou ? " (you)" : "")));
      list.appendChild(li);
    });
  }

  function addToRoster(id, name, classId, isYou) {
    for (var i = 0; i < roster.length; i++) {
      if (roster[i].id === id) { roster[i].name = name; roster[i].classId = classId; updateRosterUI(); return; }
    }
    roster.push({ id: id, name: name, classId: classId || "warrior", isYou: !!isYou });
    updateRosterUI();
  }

  function removeFromRoster(id) {
    roster = roster.filter(function (p) { return p.id !== id; });
    updateRosterUI();
  }

  function buildLocalConfig() {
    return {
      id: Network.getMyId ? Network.getMyId() : "local-" + Date.now(),
      name: getName(),
      colorIndex: 0,
      team: 0,
      classId: selectedClass,
      appearance: appearance
    };
  }

  function runCountdown(seconds, onDone) {
    var overlay = $("countdown-overlay");
    var numEl = $("countdown-number");
    if (!overlay || !numEl) { if (onDone) onDone(); return; }
    overlay.classList.remove("hidden");
    var count = seconds;
    function tick() {
      if (count > 0) {
        numEl.textContent = count;
        overlay.classList.remove("hidden");
        numEl.style.animation = "none";
        numEl.offsetHeight;
        numEl.style.animation = "";
        AudioFX.beep({ freq: 800 - count * 100, duration: 0.15, type: "square", volume: 0.12 });
        count--;
        setTimeout(tick, 800);
      } else {
        numEl.textContent = "HUNT!";
        numEl.style.fontSize = "60px";
        AudioFX.beep({ freq: 1200, duration: 0.3, type: "sawtooth", volume: 0.15 });
        setTimeout(function () {
          overlay.classList.add("hidden");
          numEl.style.fontSize = "";
          if (onDone) onDone();
        }, 600);
      }
    }
    tick();
  }

  function launchGame(configs, myId, asHost, asSolo) {
    if (gameRunning) return;
    gameRunning = true;

    document.getElementById("lobby-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");

    var canvas = $("game-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var myConfig = null;
    for (var i = 0; i < configs.length; i++) {
      if (configs[i].id === myId) { myConfig = configs[i]; break; }
    }
    if (!myConfig) myConfig = configs[0];

    Game.init({
      canvas: canvas,
      localPlayerId: myId,
      isHost: asHost,
      isSolo: asSolo,
      playerConfigs: configs
    });

    InputManager.init(canvas, function (input) {
      Game.setInput(input);
    });

    if (typeof TouchControls !== "undefined") TouchControls.init();
    if (typeof WeaponBar !== "undefined") WeaponBar.init();

    AudioFX.resume();
    AudioFX.startBattleMusic();

    runCountdown(3, function () {});
  }

  function backToLobby() {
    if (gameRunning) { Game.stop(); gameRunning = false; }
    if (typeof Network !== "undefined") Network.leaveRoom();
    roster = [];
    isHost = false;
    isSolo = false;
    roomCode = null;
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("lobby-screen").classList.remove("hidden");
    showPanel("panel-setup");
    AudioFX.stopBattleMusic();
    AudioFX.startLobbyMusic();
    $("btn-start-game").classList.add("hidden");
    $("join-error").textContent = "";
  }

  function startSolo() {
    isSolo = true;
    isHost = true;
    var cfg = buildLocalConfig();
    cfg.team = 0;
    localPlayerConfig = cfg;
    var botConfigs = [
      { id: "bot-1", name: "Bot_Archer", colorIndex: 1, team: 1, classId: "ranger", appearance: { skin: "#f5d0b0", hair: "#222", cloth: "#2980b9" } },
      { id: "bot-2", name: "Bot_Mage", colorIndex: 2, team: 1, classId: "mage", appearance: { skin: "#f5d0b0", hair: "#8e44ad", cloth: "#8e44ad" } },
      { id: "bot-3", name: "Bot_War", colorIndex: 3, team: 0, classId: "warrior", appearance: { skin: "#f5d0b0", hair: "#5d4037", cloth: "#27ae60" } }
    ];
    launchGame([cfg].concat(botConfigs), cfg.id, true, true);
  }

  function startHost() {
    isHost = true;
    isSolo = false;
    var cfg = buildLocalConfig();
    localPlayerConfig = cfg;
    roster = [{ id: cfg.id, name: cfg.name, classId: cfg.classId, isYou: true }];

    Network.hostRoom(cfg.name, {
      onPlayerJoin: function (peerId, peerName) {
        addToRoster(peerId, peerName, "warrior", false);
        Network.send({ type: "roster_update", roster: roster });
        AudioFX.beep({ freq: 520, duration: 0.12, type: "sine", volume: 0.1 });
      },
      onPlayerLeave: function (peerId) {
        removeFromRoster(peerId);
        Network.send({ type: "roster_update", roster: roster });
      },
      onStart: function (payload) {
        var allConfigs = payload.playerConfigs || [cfg];
        launchGame(allConfigs, cfg.id, true, false);
      },
      onError: function (err) {
        alert("Host error: " + (err.message || err));
        backToLobby();
      },
      onClose: function () { backToLobby(); }
    });

    roomCode = Network.getRoomCode ? Network.getRoomCode() : "????";
    $("room-code-display").textContent = roomCode;
    $("lobby-status").textContent = "Share the code! Waiting for hunters…";
    $("btn-start-game").classList.remove("hidden");
    showPanel("panel-lobby");
    AudioFX.startLobbyMusic();
  }

  function openJoinPanel() {
    showPanel("panel-join");
    refreshCampList();
  }

  function refreshCampList() {
    var list = $("camp-list");
    if (!list) return;
    list.innerHTML = "";
    var camps = [];
    try { camps = Network.listOpenCamps(); } catch (e) {}
    if (!camps || !camps.length) {
      list.innerHTML = '<li class="empty">No camps found nearby.<br>Ask your friend for the 4-letter code!</li>';
      return;
    }
    camps.forEach(function (camp) {
      var li = document.createElement("li");
      li.innerHTML = '<span><span class="camp-code">' + camp.code + '</span> — ' + (camp.name || "Unknown") + '</span><button class="btn-small join-btn">Join</button>';
      li.querySelector(".join-btn").addEventListener("click", function () {
        $("input-code").value = camp.code;
        confirmJoin();
      });
      list.appendChild(li);
    });
  }

  function confirmJoin() {
    var code = $("input-code").value.toUpperCase().trim();
    var errEl = $("join-error");
    if (!code || code.length !== 4) {
      errEl.textContent = "Enter a 4-letter code.";
      return;
    }
    errEl.textContent = "Connecting…";
    var cfg = buildLocalConfig();
    localPlayerConfig = cfg;

    Network.joinRoom(code, cfg.name, {
      onStart: function (payload) {
        var allConfigs = payload.playerConfigs || [cfg];
        launchGame(allConfigs, cfg.id, false, false);
      },
      onError: function (err) {
        errEl.textContent = (err.message || "Could not join. Wrong code or camp closed.");
      },
      onClose: function () { backToLobby(); }
    });

    Network.onMessage("roster_update", function (msg) {
      if (msg.roster) { roster = msg.roster; updateRosterUI(); }
    });

    roomCode = code;
    $("room-code-display").textContent = code;
    $("lobby-status").textContent = "Connected! Waiting for host to start…";
    $("btn-start-game").classList.add("hidden");
    roster = [{ id: cfg.id, name: cfg.name, classId: cfg.classId, isYou: true }];
    updateRosterUI();
    showPanel("panel-lobby");
  }

  function hostStartGame() {
    if (!isHost) return;
    var configs = [];
    for (var i = 0; i < roster.length; i++) {
      var r = roster[i];
      configs.push({
        id: r.id,
        name: r.name,
        colorIndex: r.isYou ? 0 : (i % 4),
        team: r.isYou ? 0 : 1,
        classId: r.classId || "warrior",
        appearance: r.isYou ? appearance : { skin: "#f5d0b0", hair: "#5d4037", cloth: "#2980b9" }
      });
    }
    Network.startGame({ playerConfigs: configs });
  }

  function copyCode() {
    var code = $("room-code-display").textContent;
    if (!code || code === "----") return;
    try {
      navigator.clipboard.writeText(code).then(function () {
        var btn = $("btn-copy-code");
        var old = btn.textContent;
        btn.textContent = "✅ Copied!";
        setTimeout(function () { btn.textContent = old; }, 1500);
      });
    } catch (e) {
      var ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    if (navigator.share) {
      navigator.share({
        title: "Join my Robin's Arena camp!",
        text: "Join my camp with code: " + code
      }).catch(function () {});
    }
  }

  function onResize() {
    var canvas = $("game-canvas");
    if (canvas && gameRunning) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (typeof Camera !== "undefined") Camera.setViewport(canvas.width, canvas.height);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && gameRunning) { backToLobby(); }
  }

  window.addEventListener("DOMContentLoaded", function () {
    initCharacterCreator();
    initClassPicker();

    $("btn-solo").addEventListener("click", startSolo);
    $("btn-host").addEventListener("click", startHost);
    $("btn-join-open").addEventListener("click", openJoinPanel);
    $("btn-join-back").addEventListener("click", function () { showPanel("panel-setup"); });
    $("btn-join-confirm").addEventListener("click", confirmJoin);
    $("btn-refresh-camps").addEventListener("click", refreshCampList);
    $("btn-lobby-back").addEventListener("click", backToLobby);
    $("btn-start-game").addEventListener("click", hostStartGame);
    $("btn-copy-code").addEventListener("click", copyCode);

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);

    var nameInput = $("player-name");
    if (nameInput && !nameInput.value) {
      var names = ["Robin", "Marian", "Tuck", "Scarlet", "Will", "Allan", "Much"];
      nameInput.value = names[Math.floor(Math.random() * names.length)];
    }

    AudioFX.startLobbyMusic();
  });
})();
