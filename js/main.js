/**
 * main.js — Lobby Create Camp / Join Camp (works with current index.html).
 * No template literals (paste-safe).
 */
(function () {
  var panels = {
    name: document.getElementById("panel-name"),
    choice: document.getElementById("panel-choice"),
    join: document.getElementById("panel-join"),
    lobby: document.getElementById("panel-lobby"),
  };
  var screenLobby = document.getElementById("screen-lobby");
  var screenGame = document.getElementById("screen-game");
  var canvas = document.getElementById("game-canvas");

  var inputName = document.getElementById("input-name");
  var inputCode = document.getElementById("input-code");
  var roomCodeDisplay = document.getElementById("room-code-display");
  var lobbyStatus = document.getElementById("lobby-status");
  var playerRoster = document.getElementById("player-roster");
  var btnStart = document.getElementById("btn-start-game");
  var campList = document.getElementById("camp-list");

  var playerName = "";
  var isHost = false;
  var currentRoomCode = "";
  var lastRosterList = [];

  function showPanel(name) {
    Object.keys(panels).forEach(function (key) {
      if (panels[key]) {
        panels[key].setAttribute("data-active", key === name ? "true" : "false");
      }
    });
  }

  function showError(err) {
    var msg = err && err.message ? err.message : (typeof err === "string" ? err : "try again.");
    if (lobbyStatus) lobbyStatus.textContent = "Error: " + msg;
    console.error("Network error:", msg);
  }

  function renderRoster(list) {
    lastRosterList = list || [];
    if (!playerRoster) return;
    playerRoster.innerHTML = "";
    lastRosterList.forEach(function (p, i) {
      var li = document.createElement("li");
      var team = (p.team === 1 || p.team === "knights" || i % 2 === 1) ? "Castle" : "Camp";
      li.textContent = p.name + " — " + team;
      if (p.id === Network.getMyId()) li.classList.add("you");
      playerRoster.appendChild(li);
    });
    if (lobbyStatus) {
      lobbyStatus.textContent = lastRosterList.length >= 2
        ? lastRosterList.length + " players in camp"
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
    }
    Game.init(payload, isHost, Network.getMyId());
    Game.start(canvas);
  }

  var sharedCallbacks = {
    onRosterUpdate: renderRoster,
    onError: showError,
    onStartGame: onStartGame,
  };

  async function refreshCampList() {
    if (!campList) return;
    campList.innerHTML = "";
    var empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Scanning for camps…";
    campList.appendChild(empty);

    try {
      var camps = await Network.listOpenCamps();
      campList.innerHTML = "";
      if (!camps.length) {
        var li = document.createElement("li");
        li.className = "empty";
        li.textContent = "No open camps found — enter a code below";
        campList.appendChild(li);
        return;
      }
      camps.forEach(function (c) {
        var li = document.createElement("li");
        var codeSpan = document.createElement("span");
        codeSpan.className = "camp-code";
        codeSpan.textContent = c.code;
        var btn = document.createElement("button");
        btn.className = "join-btn-small";
        btn.textContent = "Join";
        btn.addEventListener("click", function () {
          if (inputCode) inputCode.value = c.code;
          var joinBtn = document.getElementById("btn-join-confirm");
          if (joinBtn) joinBtn.click();
        });
        li.appendChild(codeSpan);
        li.appendChild(btn);
        campList.appendChild(li);
      });
    } catch (e) {
      campList.innerHTML = "";
      var li2 = document.createElement("li");
      li2.className = "empty";
      li2.textContent = "Could not list camps — use a code";
      campList.appendChild(li2);
    }
  }

  var btnContinue = document.getElementById("btn-continue");
  if (btnContinue) {
    btnContinue.addEventListener("click", function () {
      var name = inputName ? inputName.value.trim() : "";
      if (!name) {
        if (inputName) inputName.focus();
        return;
      }
      playerName = name;
      showPanel("choice");
    });
  }
  if (inputName) {
    inputName.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && btnContinue) btnContinue.click();
    });
  }

  var btnHost = document.getElementById("btn-host");
  if (btnHost) {
    btnHost.addEventListener("click", function () {
      if (!playerName) {
        var n = inputName ? inputName.value.trim() : "";
        if (!n) {
          showPanel("name");
          if (inputName) inputName.focus();
          return;
        }
        playerName = n;
      }
      isHost = true;
      if (lobbyStatus) lobbyStatus.textContent = "Opening camp…";
      showPanel("lobby");
      Network.hostRoom(playerName, Object.assign({}, sharedCallbacks, {
        onHostReady: function (code) {
          currentRoomCode = code;
          if (roomCodeDisplay) roomCodeDisplay.textContent = code;
          showPanel("lobby");
        },
      }));
    });
  }

  var btnJoinOpen = document.getElementById("btn-join-open");
  if (btnJoinOpen) {
    btnJoinOpen.addEventListener("click", function () {
      showPanel("join");
      refreshCampList();
    });
  }
  var btnJoinBack = document.getElementById("btn-join-back");
  if (btnJoinBack) {
    btnJoinBack.addEventListener("click", function () { showPanel("choice"); });
  }
  var btnRefresh = document.getElementById("btn-refresh-camps");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", function () { refreshCampList(); });
  }

  var btnJoinConfirm = document.getElementById("btn-join-confirm");
  if (btnJoinConfirm) {
    btnJoinConfirm.addEventListener("click", function () {
      var code = inputCode ? inputCode.value.trim().toUpperCase() : "";
      if (code.length !== 4) {
        if (inputCode) inputCode.focus();
        return;
      }
      if (!playerName) {
        var n = inputName ? inputName.value.trim() : "";
        if (!n) {
          showPanel("name");
          return;
        }
        playerName = n;
      }
      isHost = false;
      if (lobbyStatus) lobbyStatus.textContent = "Connecting to camp…";
      showPanel("lobby");
      if (roomCodeDisplay) roomCodeDisplay.textContent = code;
      Network.joinRoom(code, playerName, Object.assign({}, sharedCallbacks, {
        onJoined: function (joinedCode) {
          currentRoomCode = joinedCode;
          if (roomCodeDisplay) roomCodeDisplay.textContent = joinedCode;
        },
        onHostLeft: function () {
          if (lobbyStatus) lobbyStatus.textContent = "The host left the camp.";
        },
      }));
    });
  }
  if (inputCode) {
    inputCode.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && btnJoinConfirm) btnJoinConfirm.click();
    });
  }

  var btnLobbyBack = document.getElementById("btn-lobby-back");
  if (btnLobbyBack) {
    btnLobbyBack.addEventListener("click", function () {
      Network.leaveRoom();
      location.reload();
    });
  }

  if (btnStart) {
    btnStart.addEventListener("click", function () {
      if (!isHost || lastRosterList.length < 2) return;
      var payload = {
        players: lastRosterList.map(function (p, i) {
          return {
            id: p.id,
            name: p.name,
            colorIndex: i,
            spawnIndex: i,
            team: (typeof p.team === "number") ? p.team : (i % 2),
          };
        }),
      };
      Network.startGame(payload);
    });
  }
})();
