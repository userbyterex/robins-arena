/**
 * network.js — PeerJS P2P layer for Robin's Arena.
 * Host creates peer id "ra-<CODE>". Clients connect with that code.
 * Room browser uses PeerJS listAllPeers when available.
 */
const Network = (() => {
  const MAX_PLAYERS = 4;
  const ID_PREFIX = "ra-";
  const JOIN_TIMEOUT_MS = 12000;

  let peer = null;
  let isHost = false;
  let myName = "";
  let myId = null;
  const hostConnections = new Map();
  let roster = new Map();
  let hostConn = null;
  let joinTimeoutId = null;
  let callbacks = {};
  const messageHandlers = {};
  // Lightweight discovery peer used only to list open camps
  let discoverPeer = null;

  function onMessage(type, handler) {
    messageHandlers[type] = handler;
  }

  function ensurePeerJS() {
    if (typeof Peer === "undefined") {
      const err = new Error("PeerJS failed to load. Check connection or disable blockers.");
      callbacks.onError && callbacks.onError(err);
      return false;
    }
    return true;
  }

  function send(msg) {
    if (isHost) {
      hostConnections.forEach(({ conn }) => {
        if (conn.open) conn.send(msg);
      });
    } else if (hostConn && hostConn.open) {
      hostConn.send(msg);
    }
  }

  function randomCode() {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
    return code;
  }

  function broadcastRoster() {
    const list = Array.from(roster.entries()).map(([id, name]) => ({ id, name }));
    hostConnections.forEach(({ conn }) => {
      if (conn.open) conn.send({ type: "roster", list });
    });
    callbacks.onRosterUpdate && callbacks.onRosterUpdate(list);
  }

  function attachHostConnHandlers(conn) {
    conn.on("data", (msg) => {
      if (msg.type === "join") {
        if (roster.size >= MAX_PLAYERS) {
          conn.send({ type: "room-full" });
          conn.close();
          return;
        }
        roster.set(conn.peer, msg.name || "Player");
        hostConnections.set(conn.peer, { conn, name: msg.name });
        broadcastRoster();
      } else if (msg.type === "ping-info") {
        // Client asking for room info (name + count)
        conn.send({
          type: "room-info",
          code: myId ? myId.replace(ID_PREFIX, "") : "????",
          hostName: myName,
          players: roster.size,
          max: MAX_PLAYERS,
        });
      } else if (messageHandlers[msg.type]) {
        messageHandlers[msg.type](msg, conn.peer);
      }
    });
    conn.on("close", () => {
      roster.delete(conn.peer);
      hostConnections.delete(conn.peer);
      broadcastRoster();
      if (messageHandlers["peer-left"]) {
        messageHandlers["peer-left"]({ type: "peer-left", peerId: conn.peer });
      }
    });
    conn.on("error", (err) => {
      callbacks.onError && callbacks.onError(err);
    });
  }

  function hostRoom(name, cbs) {
    callbacks = cbs || {};
    isHost = true;
    myName = name;
    roster = new Map();

    if (!ensurePeerJS()) return;

    const code = randomCode();
    peer = new Peer(ID_PREFIX + code, { debug: 0 });

    peer.on("open", (id) => {
      myId = id;
      roster.set(id, myName);
      callbacks.onHostReady && callbacks.onHostReady(code);
      broadcastRoster();
    });

    peer.on("connection", (conn) => {
      attachHostConnHandlers(conn);
    });

    peer.on("error", (err) => {
      let msg = err && err.message ? err.message : String(err);
      if (err && err.type === "unavailable-id") {
        msg = "That camp code is already taken. Try again.";
      }
      callbacks.onError && callbacks.onError(new Error(msg));
    });
  }

  function joinRoom(code, name, cbs) {
    callbacks = cbs || {};
    isHost = false;
    myName = name;

    if (!ensurePeerJS()) return;
    if (joinTimeoutId) clearTimeout(joinTimeoutId);

    peer = new Peer({ debug: 0 });

    peer.on("open", (id) => {
      myId = id;
      const targetId = ID_PREFIX + code.toUpperCase();
      const conn = peer.connect(targetId, { reliable: true });
      hostConn = conn;

      joinTimeoutId = setTimeout(() => {
        if (!conn.open) {
          callbacks.onError && callbacks.onError(
            new Error("Could not connect. Is the code correct and is the host still in the camp?")
          );
          try { conn.close(); } catch (e) {}
        }
      }, JOIN_TIMEOUT_MS);

      conn.on("open", () => {
        if (joinTimeoutId) {
          clearTimeout(joinTimeoutId);
          joinTimeoutId = null;
        }
        conn.send({ type: "join", name: myName });
        callbacks.onJoined && callbacks.onJoined(code.toUpperCase());
      });

      conn.on("data", (msg) => {
        if (msg.type === "roster") {
          callbacks.onRosterUpdate && callbacks.onRosterUpdate(msg.list);
        } else if (msg.type === "room-full") {
          callbacks.onError && callbacks.onError(new Error("This camp is full (4 players)."));
        } else if (msg.type === "start") {
          callbacks.onStartGame && callbacks.onStartGame(msg.payload);
        } else if (messageHandlers[msg.type]) {
          messageHandlers[msg.type](msg);
        }
      });

      conn.on("close", () => {
        callbacks.onHostLeft && callbacks.onHostLeft();
      });

      conn.on("error", (err) => {
        callbacks.onError && callbacks.onError(err);
      });
    });

    peer.on("error", (err) => {
      let msg = err && err.message ? err.message : String(err);
      if (err && (err.type === "peer-unavailable" || err.type === "network")) {
        msg = "Camp not found. Check the code or ask the host to create it again.";
      }
      callbacks.onError && callbacks.onError(new Error(msg));
    });
  }

  /**
   * Discover open camps via PeerJS listAllPeers (when supported).
   * Returns promise of [{ code, id }].
   */
  function listOpenCamps() {
    return new Promise((resolve) => {
      if (typeof Peer === "undefined") {
        resolve([]);
        return;
      }

      const finish = (list) => {
        resolve(list);
      };

      const runList = (p) => {
        if (typeof p.listAllPeers !== "function") {
          finish([]);
          return;
        }
        try {
          p.listAllPeers((all) => {
            const camps = (all || [])
              .filter((id) => typeof id === "string" && id.startsWith(ID_PREFIX) && id.length === ID_PREFIX.length + 4)
              .map((id) => ({
                id,
                code: id.slice(ID_PREFIX.length).toUpperCase(),
              }));
            finish(camps);
          });
        } catch (e) {
          finish([]);
        }
      };

      if (peer && peer.open) {
        runList(peer);
        return;
      }

      if (discoverPeer && discoverPeer.open) {
        runList(discoverPeer);
        return;
      }

      try {
        discoverPeer = new Peer({ debug: 0 });
        const t = setTimeout(() => finish([]), 6000);
        discoverPeer.on("open", () => {
          clearTimeout(t);
          runList(discoverPeer);
        });
        discoverPeer.on("error", () => {
          clearTimeout(t);
          finish([]);
        });
      } catch (e) {
        finish([]);
      }
    });
  }

  function startGame(payload) {
    if (!isHost) return;
    hostConnections.forEach(({ conn }) => {
      if (conn.open) conn.send({ type: "start", payload });
    });
    callbacks.onStartGame && callbacks.onStartGame(payload);
  }

  function leaveRoom() {
    if (joinTimeoutId) {
      clearTimeout(joinTimeoutId);
      joinTimeoutId = null;
    }
    if (peer) peer.destroy();
    peer = null;
    hostConn = null;
    hostConnections.clear();
    roster = new Map();
    isHost = false;
  }

  function getMyId() { return myId; }
  function getIsHost() { return isHost; }

  return {
    MAX_PLAYERS,
    hostRoom,
    joinRoom,
    startGame,
    leaveRoom,
    getMyId,
    getIsHost,
    onMessage,
    send,
    listOpenCamps,
  };
})();
