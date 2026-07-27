/**
 * main.js — Lobby: Create Camp / Join Camp + team assignment.
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
      panels[key].setAttribute("data-active", key === name ? "true" : "false");
    });
  }

  function showError(err) {
    var msg = err && err.message ? err.message : (typeof err === "string" ? err : "try again.");
    lobbyStatus.textContent = "Error: " + msg;
  }

  function renderRoster(list) {
    lastRosterList = list;
    playerRoster.innerHTML = "";
    list.forEach(function (p, i) {
      var li = document.createElement("li");
      var team = i % 2 === 0 ? "Camp" : "Castle";
      li.textContent = p.name + " — " + team;
      if (p.id === Network.getMyId()) li.classList.add("you");
      playerRoster.appendChild(li);
    });
    lobbyStatus.textContent = list.length >= 2
      ? list.length + " players in camp"
      : "Waiting for players… (min 2)";

    if (isHost) {
      btnStart.hidden = false;
      btnStart.disabled = list.length < 2;
    } else {
      btnStart.hidden = true;
    }
  }

  function onStartGame(payload) {
    screenLobby.style.display = "none";
    screenGame.hidden = false;
    Game.init(payload, isHost, Network.getMyId());
    Game.start(canvas);
  }

  var sharedCallbacks = {
    onRosterUpdate: renderRoster,
    onError: showError,
    onStartGame: onStartGame,
  };

  async function refreshCampList() {
    campList.innerHTML = "";
    var empty = document.createElement("li");
    empty.className = "camp-list-empty";
    empty.textContent = "Scanning for camps…";
    campList.appendChild(empty);

    try {
      var camps = await Network.listOpenCamps();
      campList.innerHTML = "";
      if (!camps.length) {
        var li = document.createElement("li");
        li.className = "camp-list-empty";
        li.textContent = "No open camps found — enter a code below";
        campList.appendChild(li);
        return;
      }
      camps.forEach(function (c) {
        var li = document.createElement("li");
        var codeSpan = document.createElement("span");
        codeSpan.className = "camp-code";
        codeSpan.textContent = c.code;
        var meta = document.createElement("span");
        meta.className = "camp-meta";
        meta.textContent = "Join →";
        li.appendChild(codeSpan);
        li.appendChild(meta);
        li.addEventListener("click", function () {
          inputCode.value = c.code;
          document.getElementById("btn-join-confirm").click();
        });
        campList.appendChild(li);
      });
    } catch (e) {
      campList.innerHTML = "";
      var li2 = document.createElement("li");
      li2.className = "camp-list-empty";
      li2.textContent = "Could not list camps — use a code";
      campList.appendChild(li2);
    }
  }

  document.getElementById("btn-continue").addEventListener("click", function () {
    var name = inputName.value.trim();
    if (!name) { inputName.focus(); return; }
    playerName = name;
    showPanel("choice");
  });
  inputName.addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("btn-continue").click();
  });

  document.getElementById("btn-host").addEventListener("click", function () {
    isHost = true;
    lobbyStatus.textContent = "Opening camp…";
    Network.hostRoom(playerName, Object.assign({}, sharedCallbacks, {
      onHostReady: function (code) {
        currentRoomCode = code;
        roomCodeDisplay.textContent = code;
        showPanel("lobby");
      },
    }));
  });

  document.getElementById("btn-join-open").addEventListener("click", function () {
    showPanel("join");
    refreshCampList();
  });
  document.getElementById("btn-join-back").addEventListener("click", function () { showPanel("choice"); });
  document.getElementById("btn-refresh-camps").addEventListener("click", function () { refreshCampList(); });

  document.getElementById("btn-join-confirm").addEventListener("click", function () {
    var code = inputCode.value.trim().toUpperCase();
    if (code.length !== 4) { inputCode.focus(); return; }
    isHost = false;
    lobbyStatus.textContent = "Connecting to camp…";
    showPanel("lobby");
    roomCodeDisplay.textContent = code;
    Network.joinRoom(code, playerName, Object.assign({}, sharedCallbacks, {
      onJoined: function (joinedCode) {
        currentRoomCode = joinedCode;
        roomCodeDisplay.textContent = joinedCode;
      },
      onHostLeft: function () {
        lobbyStatus.textContent = "The host left the camp.";
      },
    }));
  });
  inputCode.addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("btn-join-confirm").click();
  });

  document.getElementById("btn-lobby-back").addEventListener("click", function () {
    Network.leaveRoom();
    location.reload();
  });

  btnStart.addEventListener("click", function () {
    if (!isHost || lastRosterList.length < 2) return;
    var payload = {
      players: lastRosterList.map(function (p, i) {
        return {
          id: p.id,
          name: p.name,
          colorIndex: i,
          spawnIndex: i,
          team: i % 2,
        };
      }),
    };
    Network.startGame(payload);
  });
})();
