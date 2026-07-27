/**
 * main.js — Lobby bulletproof (Continue always works).
 */
(function () {
  function $(id) { return document.getElementById(id); }

  var panels = {
    name: $("panel-name"),
    choice: $("panel-choice"),
    join: $("panel-join"),
    lobby: $("panel-lobby"),
  };
  var screenLobby = $("screen-lobby");
  var screenGame = $("screen-game");
  var canvas = $("game-canvas");
  var inputName = $("input-name");
  var inputCode = $("input-code");
  var roomCodeDisplay = $("room-code-display");
  var lobbyStatus = $("lobby-status");
  var playerRoster = $("player-roster");
  var btnStart = $("btn-start-game");
  var campList = $("camp-list");

  var playerName = "";
  var isHost = false;
  var lastRosterList = [];

  function showPanel(name) {
    Object.keys(panels).forEach(function (key) {
      var el = panels[key];
      if (!el) return;
      var on = key === name;
      el.setAttribute("data-active", on ? "true" : "false");
      el.style.display = on ? "flex" : "none";
    });
  }

  function showError(err) {
    var msg = err && err.message ? err.message : String(err || "error");
    if (lobbyStatus) lobbyStatus.textContent = "Error: " + msg;
    console.error(msg);
  }

  function renderRoster(list) {
    lastRosterList = list || [];
    if (!playerRoster) return;
    playerRoster.innerHTML = "";
    lastRosterList.forEach(function (p, i) {
      var li = document.createElement("li");
      var team = (p.team === 1 || i % 2 === 1) ? "Castle" : "Camp";
      li.textContent = p.name + " — " + team;
      try {
        if (typeof Network !== "undefined" && p.id === Network.getMyId()) li.classList.add("you");
      } catch (e) {}
      playerRoster.appendChild(li);
    });
    if (lobbyStatus) {
      lobbyStatus.textContent = lastRosterList.length >= 2
        ? lastRosterList.length + " players ready"
        : "Waiting for players… (min 2)";
    }
    if (btnStart) {
      if (isHost) {
        btnStart.classList.remove("hidden");
        btnStart.hidden = false;
        btnStart.disabled = lastRosterList.length < 2;
      } else {
        btnStart.classList.add("hidden");
        btnStart.hidden = true;
      }
    }
  }

  function onStartGame(payload) {
    if (screenLobby) screenLobby.style.display = "none";
    if (screenGame) {
      screenGame.classList.remove("hidden");
      screenGame.hidden = false;
      screenGame.style.display = "block";
    }
    if (typeof Game !== "undefined") {
      Game.init(payload, isHost, Network.getMyId());
      Game.start(canvas);
    }
  }

  var sharedCallbacks = {
    onRosterUpdate: renderRoster,
    onError: showError,
    onStartGame: onStartGame,
  };

  // --- CONTINUE (must work even if Network fails) ---
  var btnContinue = $("btn-continue");
  if (btnContinue) {
    btnContinue.onclick = function () {
      var name = inputName ? inputName.value.trim() : "";
      if (!name) {
        if (inputName) inputName.focus();
        return;
      }
      playerName = name;
      showPanel("choice");
    };
  }
  if (inputName) {
    inputName.onkeydown = function (e) {
      if (e.key === "Enter" && btnContinue) btnContinue.onclick();
    };
  }

  // Force name panel visible on load
  showPanel("name");

  var btnHost = $("btn-host");
  if (btnHost) {
    btnHost.onclick = function () {
      if (!playerName) {
        var n = inputName ? inputName.value.trim() : "";
        if (!n) { showPanel("name"); return; }
        playerName = n;
      }
      isHost = true;
      if (lobbyStatus) lobbyStatus.textContent = "Opening camp…";
      showPanel("lobby");
      if (typeof Network === "undefined") {
        showError("Network module missing — check network.js");
        return;
      }
      Network.hostRoom(playerName, Object.assign({}, sharedCallbacks, {
        onHostReady: function (code) {
          if (roomCodeDisplay) roomCodeDisplay.textContent = code;
          showPanel("lobby");
        },
      }));
    };
  }

  var btnJoinOpen = $("btn-join-open");
  if (btnJoinOpen) {
    btnJoinOpen.onclick = function () {
      showPanel("join");
      if (campList) {
        campList.innerHTML = "<li class='empty'>Enter a 4-letter code below</li>";
      }
      if (typeof Network !== "undefined" && Network.listOpenCamps) {
        Network.listOpenCamps().then(function (camps) {
          if (!campList) return;
          campList.innerHTML = "";
          if (!camps.length) {
            campList.innerHTML = "<li class='empty'>No open camps — enter a code</li>";
            return;
          }
          camps.forEach(function (c) {
            var li = document.createElement("li");
            li.innerHTML = "<span class='camp-code'>" + c.code + "</span>";
            var b = document.createElement("button");
            b.className = "join-btn-small";
            b.textContent = "Join";
            b.onclick = function () {
              if (inputCode) inputCode.value = c.code;
              if ($("btn-join-confirm")) $("btn-join-confirm").onclick();
            };
            li.appendChild(b);
            campList.appendChild(li);
          });
        }).catch(function () {
          if (campList) campList.innerHTML = "<li class='empty'>Use a code below</li>";
        });
      }
    };
  }

  var btnJoinBack = $("btn-join-back");
  if (btnJoinBack) btnJoinBack.onclick = function () { showPanel("choice"); };

  var btnRefresh = $("btn-refresh-camps");
  if (btnRefresh) btnRefresh.onclick = function () {
    if (btnJoinOpen) btnJoinOpen.onclick();
  };

  var btnJoinConfirm = $("btn-join-confirm");
  if (btnJoinConfirm) {
    btnJoinConfirm.onclick = function () {
      var code = inputCode ? inputCode.value.trim().toUpperCase() : "";
      if (code.length !== 4) { if (inputCode) inputCode.focus(); return; }
      if (!playerName) {
        var n = inputName ? inputName.value.trim() : "";
        if (!n) { showPanel("name"); return; }
        playerName = n;
      }
      isHost = false;
      if (lobbyStatus) lobbyStatus.textContent = "Connecting…";
      showPanel("lobby");
      if (roomCodeDisplay) roomCodeDisplay.textContent = code;
      if (typeof Network === "undefined") {
        showError("Network module missing");
        return;
      }
      Network.joinRoom(code, playerName, Object.assign({}, sharedCallbacks, {
        onJoined: function (c) {
          if (roomCodeDisplay) roomCodeDisplay.textContent = c;
        },
        onHostLeft: function () {
          if (lobbyStatus) lobbyStatus.textContent = "Host left.";
        },
      }));
    };
  }

  var btnLobbyBack = $("btn-lobby-back");
  if (btnLobbyBack) {
    btnLobbyBack.onclick = function () {
      try { if (typeof Network !== "undefined") Network.leaveRoom(); } catch (e) {}
      location.reload();
    };
  }

  if (btnStart) {
    btnStart.onclick = function () {
      if (!isHost || lastRosterList.length < 2) return;
      var payload = {
        players: lastRosterList.map(function (p, i) {
          return {
            id: p.id,
            name: p.name,
            colorIndex: i,
            spawnIndex: i,
            team: (typeof p.team === "number") ? p.team : (i % 2),
            classId: "warrior",
          };
        }),
      };
      Network.startGame(payload);
    };
  }
})();
