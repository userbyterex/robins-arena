/**
 * main.js — Lobby navigation (English): Create Camp / Join Camp + room browser.
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
  const campList = document.getElementById("camp-list");

  let playerName = "";
  let isHost = false;
  let currentRoomCode = "";
  let lastRosterList = [];

  function showPanel(name) {
    Object.entries(panels).forEach(([key, el]) =>
      el.setAttribute("data-active", key === name ? "true" : "false")
    );
  }

  function showError(err) {
    const msg = err && err.message ? err.message : (typeof err === "string" ? err : "try again.");
    lobbyStatus.textContent = "Error: " + msg;
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
      ? `${list.length} players in camp`
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

  const sharedCallbacks = {
    onRosterUpdate: renderRoster,
    onError: showError,
    onStartGame,
  };

  async function refreshCampList() {
    campList.innerHTML = "";
    const empty = document.createElement("li");
    empty.className = "camp-list-empty";
    empty.textContent = "Scanning for camps…";
    campList.appendChild(empty);

    try {
      const camps = await Network.listOpenCamps();
      campList.innerHTML = "";
      if (!camps.length) {
        const li = document.createElement("li");
        li.className = "camp-list-empty";
        li.textContent = "No open camps found — enter a code below";
        campList.appendChild(li);
        return;
      }
      camps.forEach((c) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="camp-code">${c.code}</span><span class="camp-meta">Join →</span>`;
        li.addEventListener("click", () => {
          inputCode.value = c.code;
          document.getElementById("btn-join-confirm").click();
        });
        campList.appendChild(li);
      });
    } catch (e) {
      campList.innerHTML = "";
      const li = document.createElement("li");
      li.className = "camp-list-empty";
      li.textContent = "Could not list camps — use a code";
      campList.appendChild(li);
    }
  }

  // --- Name ---
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

  // --- Create / Join choice ---
  document.getElementById("btn-host").addEventListener("click", () => {
    isHost = true;
    lobbyStatus.textContent = "Opening camp…";
    Network.hostRoom(playerName, {
      ...sharedCallbacks,
      onHostReady: (code) => {
        currentRoomCode = code;
        roomCodeDisplay.textContent = code;
        showPanel("lobby");
      },
    });
  });

  document.getElementById("btn-join-open").addEventListener("click", () => {
    showPanel("join");
    refreshCampList();
  });
  document.getElementById("btn-join-back").addEventListener("click", () => showPanel("choice"));
  document.getElementById("btn-refresh-camps").addEventListener("click", () => refreshCampList());

  // --- Join with code ---
  document.getElementById("btn-join-confirm").addEventListener("click", () => {
    const code = inputCode.value.trim().toUpperCase();
    if (code.length !== 4) {
      inputCode.focus();
      return;
    }
    isHost = false;
    lobbyStatus.textContent = "Connecting to camp…";
    showPanel("lobby");
    roomCodeDisplay.textContent = code;
    Network.joinRoom(code, playerName, {
      ...sharedCallbacks,
      onJoined: (joinedCode) => {
        currentRoomCode = joinedCode;
        roomCodeDisplay.textContent = joinedCode;
      },
      onHostLeft: () => {
        lobbyStatus.textContent = "The host left the camp.";
      },
    });
  });
  inputCode.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("btn-join-confirm").click();
  });

  // --- Lobby ---
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
