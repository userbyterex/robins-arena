/**
 * main.js
 * Controla la navegación entre paneles del lobby y, al iniciar la partida,
 * oculta el lobby y arranca Game (game.js) sobre el canvas.
 */
(() => {
  const panels = {
    name: document.getElementById("panel-name"),
    choice: document.getElementById("panel-choice"),
    join: document.getElementById("panel-join"),
    lobby: document.getElementById("panel-lobby"),
  };
  const screenLobby = document.getElementById("screen-lobby");
  const screenGame = document.getElementById("screen-game");
  const canvas = document.getElementById("game-canvas");

  const inputName = document.getElementById("input-name");
  const inputCode = document.getElementById("input-code");
  const roomCodeDisplay = document.getElementById("room-code-display");
  const lobbyStatus = document.getElementById("lobby-status");
  const playerRoster = document.getElementById("player-roster");
  const btnStart = document.getElementById("btn-start-game");

  let playerName = "";
  let isHost = false;
  let currentRoomCode = "";
  let lastRosterList = [];

  function showPanel(name) {
    Object.entries(panels).forEach(([key, el]) => el.setAttribute("data-active", key === name ? "true" : "false"));
  }

  function showError(err) {
    lobbyStatus.textContent = "Algo salió mal: " + (err && err.message ? err.message : "intenta de nuevo.");
  }

  function renderRoster(list) {
    lastRosterList = list;
    playerRoster.innerHTML = "";
    list.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p.name;
      if (p.id === Network.getMyId()) li.classList.add("you");
      playerRoster.appendChild(li);
    });
    lobbyStatus.textContent = list.length >= 2
      ? `${list.length} forajidos en el campamento`
      : "Esperando forajidos\u2026 (mínimo 2)";

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

  const sharedCallbacks = {
    onRosterUpdate: renderRoster,
    onError: showError,
    onStartGame,
  };

  // --- Panel: nombre ---
  document.getElementById("btn-continue").addEventListener("click", () => {
    const name = inputName.value.trim();
    if (!name) {
      inputName.focus();
      return;
    }
    playerName = name;
    showPanel("choice");
  });
  inputName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btn-continue").click();
  });

  // --- Panel: elegir host / join ---
  document.getElementById("btn-host").addEventListener("click", () => {
    isHost = true;
    Network.hostRoom(playerName, {
      ...sharedCallbacks,
      onHostReady: (code) => {
        currentRoomCode = code;
        roomCodeDisplay.textContent = code;
        showPanel("lobby");
      },
    });
  });

  document.getElementById("btn-join-open").addEventListener("click", () => showPanel("join"));
  document.getElementById("btn-join-back").addEventListener("click", () => showPanel("choice"));

  // --- Panel: unirse con código ---
  document.getElementById("btn-join-confirm").addEventListener("click", () => {
    const code = inputCode.value.trim().toUpperCase();
    if (code.length !== 4) {
      inputCode.focus();
      return;
    }
    isHost = false;
    Network.joinRoom(code, playerName, {
      ...sharedCallbacks,
      onJoined: (code) => {
        currentRoomCode = code;
        roomCodeDisplay.textContent = code;
        showPanel("lobby");
      },
      onHostLeft: () => {
        lobbyStatus.textContent = "El anfitrión abandonó el campamento.";
      },
    });
  });
  inputCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btn-join-confirm").click();
  });

  // --- Panel: lobby ---
  document.getElementById("btn-lobby-back").addEventListener("click", () => {
    Network.leaveRoom();
    location.reload();
  });

  btnStart.addEventListener("click", () => {
    if (!isHost || lastRosterList.length < 2) return;
    const payload = {
      players: lastRosterList.map((p, i) => ({
        id: p.id, name: p.name, colorIndex: i, spawnIndex: i,
      })),
    };
    Network.startGame(payload);
  });
})();
