/**
 * main.js — Complete lobby + safe game start (solo OK for testing).
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
  var playerClassMap = {};

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

  function buildClassPicker() {
    if (!classPicker) return;
    classPicker.innerHTML = "";
    var order = (typeof CLASS_ORDER !== "undefined") ? CLASS_ORDER : ["warrior", "ranger", "mage", "monk"];
    order.forEach(function (id) {
      var c = (typeof getClass === "function") ? getClass(id) : { id: id, name: id, icon: "?", tagline: "", color: "#888" };
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "class-btn" + (id === selectedClass ? " selected" : "");
      btn.innerHTML = "<span class='class-icon'>" + (c.icon || "?") + "</span>" +
        "<span class='class-name'>" + (c.name || id) + "</span>" +
        "<span class='class-tag'>" + (c.tagline || "") + "</span>";
      btn.style.borderColor = c.color || "#888";
      btn.onclick = function () {
        selectedClass = id;
        var all = classPicker.querySelectorAll(".class-btn");
        for (var i = 0; i < all.length; i++) all[i].classList.remove("selected");
        btn.classList.add("selected");
        if (typeof Network !== "undefined" && Network.send) {
          Network.send({ type: "class-pick", classId: id });
        }
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
      var clsId = playerClassMap[p.id] || p.classId || "warrior";
      var cls = (typeof getClass === "function") ? getClass(clsId) : { icon: "" };
      li.textContent = (cls.icon ? cls.icon + " " : "") + p.name + " — " + team;
      try {
        if (typeof Network !== "undefined" && p.id === Network.getMyId()) li.classList.add("you");
      } catch (e) {}
      playerRoster.appendChild(li);
    });
    if (lobbyStatus) {
      lobbyStatus.textContent = lastRosterList.length + " player(s) — host can start";
    }
    if (btnStart) {
      if (isHost) {
        btnStart.classList.remove("hidden");
        btnStart.hidden = false;
        btnStart.disabled = lastRosterList.length < 1;
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

      if (typeof Game === "undefined") {
        alert("Game module missing — check game.js");
        return;
      }

      Game.init(payload || { players: [] }, isHost, id);
      Game.start(canvas);
    } catch (e) {
      console.error("onStartGame failed:", e);
      alert("Start failed: " + (e.message || e));
      if (canvas) {
        var c = canvas.getContext("2d");
        if (c) {
          c.fillStyle = "#1a2b1e";
          c.fillRect(0, 0, canvas.width, canvas.height);
          c.fillStyle = "#ff6666";
          c.font = "16px monospace";
          c.textAlign = "center";
          c.fillText("Start error: " + (e.message || e), canvas.width / 2, canvas.height / 2);
        }
      }
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
      if (lobbyStatus) lobbyStatus.textContent = "Opening camp…";
      showPanel("lobby");
      buildClassPicker();
      if (typeof Network === "undefined") {
        showError("Network missing — upload network.js");
        return;
      }
      Network.hostRoom(playerName, Object.assign({}, sharedCallbacks, {
        onHostReady: function (code) {
          if (roomCodeDisplay) roomCodeDisplay.textContent = code;
          try { playerClassMap[Network.getMyId()] = selectedClass; } catch (e) {}
          showPanel("lobby");
        },
      }));
      if (Network.onMessage) {
        Network.onMessage("class-pick", function (msg, fromId) {
          if (msg && msg.classId) {
            playerClassMap[fromId] = msg.classId;
            renderRoster(lastRosterList);
          }
        });
      }
    };
  }

  var btnJoinOpen = $("btn-join-open");
  if (btnJoinOpen) {
    btnJoinOpen.onclick = function () {
      showPanel("join");
      if (campList) campList.innerHTML = "<li class='empty'>Enter a 4-letter code</li>";
      if (typeof Network !== "undefined" && Network.listOpenCamps) {
        Network.listOpenCamps().then(function (camps) {
          if (!campList) return;
          campList.innerHTML = "";
          if (!camps.length) {
            campList.innerHTML = "<li class='empty'>No camps — enter code</li>";
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
          if (campList) campList.innerHTML = "<li class='empty'>Use code below</li>";
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
      buildClassPicker();
      if (roomCodeDisplay) roomCodeDisplay.textContent = code;
      if (typeof Network === "undefined") {
        showError("Network missing");
        return;
      }
      Network.joinRoom(code, playerName, Object.assign({}, sharedCallbacks, {
        onJoined: function (c) {
          if (roomCodeDisplay) roomCodeDisplay.textContent = c;
          Network.send({ type: "class-pick", classId: selectedClass });
        },
        onHostLeft: function () {
          if (lobbyStatus) lobbyStatus.textContent = "Host left.";
        },
      }));
    };
  }
  if (inputCode) {
    inputCode.onkeydown = function (e) {
      if (e.key === "Enter" && btnJoinConfirm) btnJoinConfirm.onclick();
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
      if (lastRosterList.length < 1) {
        showError("No players yet — wait for camp code to appear");
        return;
      }
      try { playerClassMap[Network.getMyId()] = selectedClass; } catch (e) {}
      var payload = {
        players: lastRosterList.map(function (p, i) {
          return {
            id: p.id,
            name: p.name,
            colorIndex: i,
            spawnIndex: i,
            team: (typeof p.team === "number") ? p.team : (i % 2),
            classId: playerClassMap[p.id] || p.classId || selectedClass || "warrior",
          };
        }),
      };
      var myId = null;
      try { myId = Network.getMyId(); } catch (e) {}
      if (myId) {
        var found = false;
        for (var i = 0; i < payload.players.length; i++) {
          if (payload.players[i].id === myId) found = true;
        }
        if (!found) {
          payload.players.unshift({
            id: myId,
            name: playerName || "Host",
            colorIndex: 0,
            spawnIndex: 0,
            team: 0,
            classId: selectedClass,
          });
        }
      }
      Network.startGame(payload);
    };
  }
})();
