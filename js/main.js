/**
 * main.js — Lobby + launchGame + Privy required.
 */
(function () {
  "use strict";

  var selectedClass = "warrior";
  var appearance = { skin: "", hair: "", cloth: "" };
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
      if (pid === id) el.classList.add("active");
      else el.classList.remove("active");
    });
  }

  function getPixelColors() {
    if (typeof PixelCharacter === "undefined") return null;
    return {
      skin: PixelCharacter.getSkinTones ? PixelCharacter.getSkinTones() : [],
      hair: PixelCharacter.getHairColors ? PixelCharacter.getHairColors() : [],
      cloth: PixelCharacter.getClothColors ? PixelCharacter.getClothColors() : []
    };
  }

  function initCharacterCreator() {
    var colors = getPixelColors();
    if (!colors) {
      var box = $("char-preview");
      if (box) {
        var cvs = document.createElement("canvas");
        cvs.width = 64;
        cvs.height = 64;
        var ctx = cvs.getContext("2d");
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(16, 16, 32, 32);
        ctx.fillStyle = "#f5d0a9";
        ctx.fillRect(24, 8, 16, 16);
        box.appendChild(cvs);
      }
      return;
    }

    var categories = [
      { key: "skin", row: "skin-row", colors: colors.skin },
      { key: "hair", row: "hair-row", colors: colors.hair },
      { key: "cloth", row: "cloth-row", colors: colors.cloth }
    ];

    categories.forEach(function (cat) {
      var row = $(cat.row);
      if (!row) return;
      row.querySelectorAll(".color-btn").forEach(function (b) { b.remove(); });
      var list = cat.colors || [];
      list.forEach(function (color, cidx) {
        var btn = document.createElement("button");
        btn.className = "color-btn" + (cidx === 0 ? " active" : "");
        btn.style.background = color;
        btn.setAttribute("aria-label", cat.key + " color");
        btn.addEventListener("click", function () {
          appearance[cat.key] = color;
          row.querySelectorAll(".color-btn").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          updatePreview();
        });
        row.appendChild(btn);
      });
      if (list.length && !appearance[cat.key]) appearance[cat.key] = list[0];
    });
    updatePreview();
  }

  function updatePreview() {
    var box = $("char-preview");
    if (!box) return;
    box.innerHTML = "";

    if (typeof PixelCharacter !== "undefined" && PixelCharacter.generate) {
      var cvs = PixelCharacter.generate(selectedClass, appearance);
      if (cvs) {
        var display = document.createElement("canvas");
        display.width = 64;
        display.height = 64;
        var dctx = display.getContext("2d");
        dctx.imageSmoothingEnabled = false;
        dctx.drawImage(cvs, 0, 0, 64, 64);
        box.appendChild(display);
        return;
      }
    }

    var cvs2 = document.createElement("canvas");
    cvs2.width = 64;
    cvs2.height = 64;
    var ctx2 = cvs2.getContext("2d");
    ctx2.fillStyle = appearance.cloth || "#c0392b";
    ctx2.fillRect(20, 28, 24, 20);
    ctx2.fillStyle = appearance.skin || "#f5d0a9";
    ctx2.fillRect(24, 12, 16, 16);
    ctx2.fillStyle = appearance.hair || "#5d4037";
    ctx2.fillRect(22, 8, 20, 8);
    box.appendChild(cvs2);
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
      selectedClass = card.getAttribute("data-class") || "warrior";
      updatePreview();
    });
  }

  function getName() {
    var n = $("player-name") ? $("player-name").value.trim() : "";
    if (!n && typeof Auth !== "undefined" && Auth.isAuthenticated && Auth.isAuthenticated()) {
      n = Auth.getDisplayName() || "";
    }
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
      icon.textContent = p.classId === "warrior" ? "⚔️" :
                         p.classId === "ranger" ? "🏹" :
                         p.classId === "mage" ? "🔮" : "🥋";
      li.appendChild(icon);
      li.appendChild(document.createTextNode(" " + p.name + (p.isYou ? " (you)" : "")));
      list.appendChild(li);
    });

    var status = $("lobby-status");
    if (status) {
      status.textContent = roster.length >= 2
        ? roster.length + " hunters ready"
        : "Waiting for hunters… (min 2)";
    }

    var btn = $("btn-start-game");
    if (btn && isHost) {
      btn.disabled = roster.length < 2;
      btn.classList.toggle("hidden", false);
    }
  }

  function addToRoster(id, name, classId, isYou, appearanceData) {
    for (var i = 0; i < roster.length; i++) {
      if (roster[i].id === id) {
        roster[i].name = name;
        roster[i].classId = classId || "warrior";
        roster[i].appearance = appearanceData || null;
        updateRosterUI();
        return;
      }
    }
    roster.push({
      id: id,
      name: name,
      classId: classId || "warrior",
      isYou: !!isYou,
      appearance: appearanceData || null
    });
    updateRosterUI();
  }

  function removeFromRoster(id) {
    roster = roster.filter(function (p) { return p.id !== id; });
    updateRosterUI();
  }

  function buildLocalConfig() {
    return {
      id: (typeof Network !== "undefined" && Network.getMyId) ? Network.getMyId() : "local-" + Date.now(),
      name: getName(),
      colorIndex: 0,
      team: 0,
      classId: selectedClass,
      appearance: Object.assign({}, appearance),
      privyId: (typeof Auth !== "undefined" && Auth.getUserId) ? Auth.getUserId() : null
    };
  }

  function runCountdown(seconds, onDone) {
    var overlay = $("countdown-overlay");
    var numEl = $("countdown-number");
    if (!overlay || !numEl) {
      if (onDone) onDone();
      return;
    }
    overlay.classList.remove("hidden");
    var count = seconds;
    function tick() {
      if (count > 0) {
        numEl.textContent = String(count);
        overlay.classList.remove("hidden");
        count--;
        setTimeout(tick, 800);
      } else {
        numEl.textContent = "HUNT!";
        setTimeout(function () {
          overlay.classList.add("hidden");
          if (onDone) onDone();
        }, 600);
      }
    }
    tick();
  }

  function launchGame(configs, myId, asHost, asSolo) {
    if (gameRunning) return;
    gameRunning = true;
    document.body.classList.add("playing");

    var lobby = document.getElementById("lobby-screen");
    var game = document.getElementById("game-screen");
    if (lobby) lobby.classList.add("hidden");
    if (game) game.classList.remove("hidden");

    var canvas = $("game-canvas");
    if (!canvas) {
      console.error("[main] no canvas");
      gameRunning = false;
      return;
    }

    canvas.width = window.innerWidth || 960;
    canvas.height = window.innerHeight || 640;

    if (typeof Game === "undefined" || !Game.init) {
      console.error("[main] Game missing");
      gameRunning = false;
      return;
    }
    if (typeof HostSim === "undefined" || !HostSim.init) {
      console.error("[main] HostSim missing");
      gameRunning = false;
      return;
    }

    try {
      Game.init({
        canvas: canvas,
        localPlayerId: myId,
        isHost: asHost,
        isSolo: asSolo,
        playerConfigs: configs || []
      });
    } catch (err) {
      console.error("[main] Game.init", err);
      gameRunning = false;
      return;
    }

    if (typeof InputManager !== "undefined" && InputManager.init) {
      InputManager.init(canvas, function (input) {
        if (typeof Game !== "undefined" && Game.setInput) Game.setInput(input);
      });
    }

    if (typeof TouchControls !== "undefined" && TouchControls.init) {
      try { TouchControls.init(); } catch (e) { console.warn(e); }
    }

    if (typeof WeaponBar !== "undefined" && $("weapon-bar") && WeaponBar.init) {
      WeaponBar.init($("weapon-bar"), function (weaponId) {
        if (typeof InputManager !== "undefined" && InputManager.setWeapon) {
          InputManager.setWeapon(weaponId);
        }
      });
    }

    var fsBtn = $("btn-fullscreen");
    if (fsBtn) {
      fsBtn.onclick = function () {
        var el = document.getElementById("game-screen");
        if (!el) return;
        var doc = document;
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
          if (doc.exitFullscreen) doc.exitFullscreen();
          else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
        } else {
          if (el.requestFullscreen) el.requestFullscreen();
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }
        setTimeout(function () {
          if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (typeof Camera !== "undefined" && Camera.setViewport) {
              Camera.setViewport(canvas.width, canvas.height);
            }
          }
        }, 200);
      };
    }

    if (typeof AudioFX !== "undefined") {
      try {
        if (AudioFX.resume) AudioFX.resume();
        if (AudioFX.startBattleMusic) AudioFX.startBattleMusic();
      } catch (e) {}
    }

    runCountdown(3, function () {});
  }

  function backToLobby() {
    if (gameRunning) {
      if (typeof Game !== "undefined" && Game.stop) Game.stop();
      gameRunning = false;
    }
    if (typeof Network !== "undefined" && Network.leaveRoom) Network.leaveRoom();
    roster = [];
    isHost = false;
    isSolo = false;
    roomCode = null;

    document.body.classList.remove("playing");

    var game = document.getElementById("game-screen");
    var lobby = document.getElementById("lobby-screen");
    if (game) game.classList.add("hidden");
    if (lobby) lobby.classList.remove("hidden");
    showPanel("panel-setup");

    if (typeof AudioFX !== "undefined") {
      try {
        if (AudioFX.stopBattleMusic) AudioFX.stopBattleMusic();
        if (AudioFX.startLobbyMusic) AudioFX.startLobbyMusic();
      } catch (e) {}
    }

    var btn = $("btn-start-game");
    if (btn) btn.classList.add("hidden");
    var err = $("join-error");
    if (err) err.textContent = "";

    if (typeof Auth !== "undefined" && Auth.updateUI) Auth.updateUI();
  }

  function startSolo() {
    if (typeof Auth !== "undefined" && Auth.requireAuth && !Auth.requireAuth()) return;
    isSolo = true;
    isHost = true;
    var cfg = buildLocalConfig();
    cfg.team = 0;
    localPlayerConfig = cfg;

    var botConfigs = [
      { id: "bot-1", name: "Bot_Archer", colorIndex: 1, team: 1, classId: "ranger", appearance: { skin: "#f5d0a9", hair: "#222", cloth: "#2980b9" } },
      { id: "bot-2", name: "Bot_Mage", colorIndex: 2, team: 1, classId: "mage", appearance: { skin: "#f5d0a9", hair: "#8e44ad", cloth: "#8e44ad" } },
      { id: "bot-3", name: "Bot_War", colorIndex: 3, team: 0, classId: "warrior", appearance: { skin: "#f5d0a9", hair: "#5d4037", cloth: "#27ae60" } }
    ];
    launchGame([cfg].concat(botConfigs), cfg.id, true, true);
  }

  function startHost() {
    if (typeof Auth !== "undefined" && Auth.requireAuth && !Auth.requireAuth()) return;
    isHost = true;
    isSolo = false;
    var cfg = buildLocalConfig();
    localPlayerConfig = cfg;
    roster = [{ id: cfg.id, name: cfg.name, classId: cfg.classId, isYou: true, appearance: cfg.appearance }];

    if (typeof Network === "undefined" || !Network.hostRoom) {
      alert("Network missing");
      return;
    }

    Network.hostRoom(cfg.name, {
      onPlayerJoin: function (peerId, peerName, classId, appearanceData) {
        addToRoster(peerId, peerName, classId || "warrior", false, appearanceData);
        Network.send({ type: "roster_update", roster: roster });
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
    }, cfg.classId, cfg.appearance);

    roomCode = Network.getRoomCode ? Network.getRoomCode() : "????";
    if ($("room-code-display")) $("room-code-display").textContent = roomCode;
    if ($("lobby-status")) $("lobby-status").textContent = "Share the code! Waiting for hunters…";
    if ($("btn-start-game")) $("btn-start-game").classList.remove("hidden");
    showPanel("panel-lobby");
  }

  function openJoinPanel() {
    if (typeof Auth !== "undefined" && Auth.requireAuth && !Auth.requireAuth()) return;
    showPanel("panel-join");
    refreshCampList();
  }

  function refreshCampList() {
    var list = $("camp-list");
    if (!list) return;
    list.innerHTML = "";
    var camps = [];
    try {
      if (typeof Network !== "undefined" && Network.listOpenCamps) camps = Network.listOpenCamps();
    } catch (e) {}
    if (!camps || !camps.length) {
      list.innerHTML = '<li class="empty">No camps found. Ask for the 4-letter code!</li>';
      return;
    }
    camps.forEach(function (camp) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="camp-code">' + camp.code + '</span> — ' + (camp.name || "Unknown") +
        ' <button class="btn-small join-btn">Join</button>';
      li.querySelector(".join-btn").addEventListener("click", function () {
        if ($("input-code")) $("input-code").value = camp.code;
        confirmJoin();
      });
      list.appendChild(li);
    });
  }

  function confirmJoin() {
    if (typeof Auth !== "undefined" && Auth.requireAuth && !Auth.requireAuth()) return;
    var code = ($("input-code") ? $("input-code").value : "").toUpperCase().trim();
    var errEl = $("join-error");
    if (!code || code.length !== 4) {
      if (errEl) errEl.textContent = "Enter a 4-letter code.";
      return;
    }
    if (errEl) errEl.textContent = "Connecting…";

    var cfg = buildLocalConfig();
    localPlayerConfig = cfg;

    if (typeof Network === "undefined" || !Network.joinRoom) {
      if (errEl) errEl.textContent = "Network missing";
      return;
    }

    Network.joinRoom(code, cfg.name, {
      onStart: function (payload) {
        var allConfigs = payload.playerConfigs || [cfg];
        launchGame(allConfigs, cfg.id, false, false);
      },
      onError: function (err) {
        if (errEl) errEl.textContent = (err.message || "Could not join.");
      },
      onClose: function () { backToLobby(); }
    }, cfg.classId, cfg.appearance);

    if (Network.onMessage) {
      Network.onMessage("roster_update", function (msg) {
        if (msg.roster) {
          roster = msg.roster.map(function (r) {
            return {
              id: r.id,
              name: r.name,
              classId: r.classId || "warrior",
              isYou: r.id === cfg.id,
              appearance: r.appearance || null
            };
          });
          updateRosterUI();
        }
      });
    }

    roomCode = code;
    if ($("room-code-display")) $("room-code-display").textContent = code;
    if ($("lobby-status")) $("lobby-status").textContent = "Connected! Waiting for host…";
    if ($("btn-start-game")) $("btn-start-game").classList.add("hidden");
    roster = [{ id: cfg.id, name: cfg.name, classId: cfg.classId, isYou: true, appearance: cfg.appearance }];
    updateRosterUI();
    showPanel("panel-lobby");
  }

  function hostStartGame() {
    if (!isHost || roster.length < 2) return;
    var configs = [];
    for (var i = 0; i < roster.length; i++) {
      var r = roster[i];
      configs.push({
        id: r.id,
        name: r.name,
        colorIndex: i % 4,
        team: i % 2,
        classId: r.classId || "warrior",
        appearance: r.appearance || { skin: "#f5d0a9", hair: "#5d4037", cloth: "#2980b9" }
      });
    }
    if (typeof Network !== "undefined" && Network.startGame) {
      Network.startGame({ playerConfigs: configs });
    }
  }

  function copyCode() {
    var code = $("room-code-display") ? $("room-code-display").textContent : "";
    if (!code || code === "----") return;
    try {
      navigator.clipboard.writeText(code);
    } catch (e) {
      var ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function onResize() {
    var canvas = $("game-canvas");
    if (canvas && gameRunning) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (typeof Camera !== "undefined" && Camera.setViewport) {
        Camera.setViewport(canvas.width, canvas.height);
      }
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && gameRunning) backToLobby();
  }

  function wireAuth() {
    if (typeof window.Auth === "undefined") {
      setTimeout(wireAuth, 80);
      return;
    }
    Auth.init();
    var bo = $("btn-auth-logout");
    var br = $("btn-open-ranking");
    var bc = $("btn-close-ranking");
    if (bo) bo.addEventListener("click", function () { Auth.logout(); });
    if (br) br.addEventListener("click", function () {
      if (typeof Ranking !== "undefined") Ranking.open();
    });
    if (bc) bc.addEventListener("click", function () {
      if (typeof Ranking !== "undefined") Ranking.close();
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    initCharacterCreator();
    initClassPicker();
    wireAuth();

    if ($("btn-solo")) $("btn-solo").addEventListener("click", startSolo);
    if ($("btn-host")) $("btn-host").addEventListener("click", startHost);
    if ($("btn-join-open")) $("btn-join-open").addEventListener("click", openJoinPanel);
    if ($("btn-join-back")) $("btn-join-back").addEventListener("click", function () { showPanel("panel-setup"); });
    if ($("btn-join-confirm")) $("btn-join-confirm").addEventListener("click", confirmJoin);
    if ($("btn-refresh-camps")) $("btn-refresh-camps").addEventListener("click", refreshCampList);
    if ($("btn-lobby-back")) $("btn-lobby-back").addEventListener("click", backToLobby);
    if ($("btn-start-game")) $("btn-start-game").addEventListener("click", hostStartGame);
    if ($("btn-copy-code")) $("btn-copy-code").addEventListener("click", copyCode);

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);

    var nameInput = $("player-name");
    if (nameInput && !nameInput.value) {
      var names = ["Robin", "Marian", "Tuck", "Scarlet", "Will", "Allan", "Much", "John"];
      nameInput.value = names[Math.floor(Math.random() * names.length)];
    }
  });
})();
