/**
 * main.js — Solo play OK + safe start + visible errors.
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
  var classPicker = $("class-picker");

  var playerName = "";
  var isHost = false;
  var lastRosterList = [];
  var selectedClass = "warrior";

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

  function renderClassPicker() {
    if (!classPicker) return;
    classPicker.innerHTML = "";
    if (typeof CLASS_ORDER === "undefined" || typeof CLASSES === "undefined") return;
    CLASS_ORDER.forEach(function (cid) {
      var c = CLASSES[cid];
      var btn = document.createElement("button");
      btn.className = "class-btn" + (cid === selectedClass ? " selected" : "");
      btn.innerHTML = '<div class="class-icon">' + c.icon + '</div><div class="class-name">' + c.name + '</div><div class="class-tag">' + c.tagline + '</div>';
      btn.onclick = function () {
        selectedClass = cid;
        Array.from(classPicker.children).forEach(function (b) { b.classList.remove("selected"); });
        btn.classList.add("selected");
      };
      classPicker.appendChild(btn);
    });
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
      lobbyStatus.textContent = lastRosterList.length + " player(s) — host can start anytime";
    }
    if (btnStart) {
      if (isHost) {
        btnStart.classList.remove("hidden");
        btnStart.hidden = false;
        btnStart.disabled = false;
      } else {
        btnStart.classList.add("hidden");
        btnStart.hidden = true;
      }
    }
  }

  function onStartGame(payload) {
    try {
      if (screenLobby) {
        screenLobby.style.display = "none";
        screenLobby.classList.add("hidden");
      }
      if (screenGame) {
        screenGame.classList.remove("hidden");
        screenGame.hidden = false;
        screenGame.style.display = "block";
      }

      var id = null;
      try { id = Network.getMyId(); } catch (e) {}
      if (!id && payload && payload.players && payload.players.length) {
        id = payload.players[0].id;
      }
      if (!id) id = "local-host";

      if (typeof Game === "undefined") {
        alert("Game module missing");
        return;
      }
      if (!payload || !payload.players || !payload.players.length) {
        payload = {
          players: [{
            id: id,
            name: playerName || "Host",
            colorIndex: 0,
            spawnIndex: 0,
            team: 0,
            classId: selectedClass,
          }],
        };
      }

      Game.init(payload, isHost, id);
      Game.start(canvas);
    } catch (e) {
      console.error(e);
      alert("START ERROR: " + (e.message || e));
    }
  }

  var sharedCallbacks = {
    onRosterUpdate: renderRoster,
    onError: showError,
    onStartGame: onStartGame,
  };

  var btnContinue = $("btn-continue");
  if (btnContinue) {
    btnContinue.onclick = function () {
      var name = inputName ? inputName.value.trim() : "";
      if (!name) { if (inputName) inputName.focus(); return; }
      playerName = name;
      showPanel("choice");
    };
  }
  if (inputName) {
    inputName.onkeydown = function (e) {
      if (e.key === "Enter" && btnContinue) btnContinue.onclick();
    };
  }
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
      if (lobbyStatus) lobbyStatus.textContent = "Opening camp...";
      showPanel("lobby");
      renderRoster([{ id: "pending", name: playerName, team: 0 }]);
      renderClassPicker();
      if (typeof Network === "undefined") {
        showError("Network missing");
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
      if (campList) campList.innerHTML = "Enter a 4-letter code<br>";
      if (typeof Network !== "undefined" && Network.listOpenCamps) {
        Network.listOpenCamps().then(function (camps) {
          if (!campList) return;
          campList.innerHTML = "";
          if (!camps.length) {
            campList.innerHTML = "No camps — enter code<br>";
            return;
          }
          camps.forEach(function (c) {
            var li = document.createElement("li");
            var span = document.createElement("span");
            span.className = "camp-code";
            span.textContent = c.code;
            var b = document.createElement("button");
            b.className = "join-btn-small";
            b.textContent = "Join";
            b.onclick = function () {
              if (inputCode) inputCode.value = c.code;
              if ($("btn-join-confirm")) $("btn-join-confirm").onclick();
            };
            li.appendChild(span);
            li.appendChild(b);
            campList.appendChild(li);
          });
        }).catch(function () {
          if (campList) campList.innerHTML = "Use code below<br>";
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
      if (lobbyStatus) lobbyStatus.textContent = "Connecting...";
      showPanel("lobby");
      if (roomCodeDisplay) roomCodeDisplay.textContent = code;
      renderClassPicker();
      if (typeof Network === "undefined") {
        showError("Network missing");
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
      if (!isHost) return;

      var myId = null;
      try { myId = Network.getMyId(); } catch (e) {}

      var players = (lastRosterList && lastRosterList.length) ? lastRosterList.slice() : [];

      if (myId) {
        var found = false;
        for (var i = 0; i < players.length; i++) {
          if (players[i].id === myId) found = true;
        }
        if (!found) {
          players.unshift({ id: myId, name: playerName || "Host", team: 0, classId: selectedClass });
        }
      } else if (!players.length) {
        myId = "local-host";
        players = [{ id: myId, name: playerName || "Host", team: 0, classId: selectedClass }];
      }

      var payload = {
        players: players.map(function (p, i) {
          return {
            id: p.id,
            name: p.name || ("P" + i),
            colorIndex: i,
            spawnIndex: i,
            team: (typeof p.team === "number") ? p.team : (i % 2),
            classId: p.classId || selectedClass || "warrior",
          };
        }),
      };

      try {
        if (typeof Network !== "undefined" && Network.startGame) {
          Network.startGame(payload);
        } else {
          onStartGame(payload);
        }
      } catch (e) {
        alert("Start failed: " + (e.message || e));
      }
    };
  }
})();
          
