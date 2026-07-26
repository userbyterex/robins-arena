/**
 * network.js
 * Capa de red peer-to-peer para Robin's Arena, usando PeerJS (WebRTC).
 * No requiere backend propio: usa el servidor de señalización público y
 * gratuito de PeerJS solo para el "apretón de manos" inicial. Una vez
 * conectados, los datos viajan directo entre navegadores.
 *
 * Protocolo de sala:
 *  - El anfitrión (host) crea un Peer con id "ra-<CODIGO>".
 *  - Los demás jugadores se conectan directamente a ese id usando el código.
 *  - El host es la autoridad de la sala: mantiene el roster y lo retransmite.
 *
 * Este archivo expone un objeto global `Network` con:
 *   Network.hostRoom(name, callbacks)
 *   Network.joinRoom(code, name, callbacks)
 *   Network.startGame(payload)
 *   Network.leaveRoom()
 *   Network.MAX_PLAYERS
 */

const Network = (() => {
  const MAX_PLAYERS = 4;
  const ID_PREFIX = "ra-"; // Robin's Arena
  const JOIN_TIMEOUT_MS = 12000;

  let peer = null;
  let isHost = false;
  let myName = "";
  let myId = null;

  // Solo usado por el host: conexiones activas -> {conn, name}
  const hostConnections = new Map();
  // Roster compartido: peerId -> name (incluye al host)
  let roster = new Map();

  // Solo usado por el cliente: conexión hacia el host
  let hostConn = null;
  let joinTimeoutId = null;

  let callbacks = {};
  const messageHandlers = {}; // type -> fn(msg, fromPeerId)

  function onMessage(type, handler) {
    messageHandlers[type] = handler;
  }

  function ensurePeerJS() {
    if (typeof Peer === "undefined") {
      const err = new Error("PeerJS no cargó. Revisa tu conexión o desactiva bloqueadores.");
      callbacks.onError && callbacks.onError(err);
      return false;
    }
    return true;
  }

  // Host: difunde a todos los clientes. Cliente: envía al host.
  // Se usa tanto para 'input' (cliente->host) como 'snapshot' (host->clientes).
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
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I/O para evitar confusión
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
        roster.set(conn.peer, msg.name || "Forajido");
        hostConnections.set(conn.peer, { conn, name: msg.name });
        broadcastRoster();
      } else if (messageHandlers[msg.type]) {
        messageHandlers[msg.type](msg, conn.peer);
      }
    });
    conn.on("close", () => {
      roster.delete(conn.peer);
      hostConnections.delete(conn.peer);
      broadcastRoster();
      // Avisa a la simulación si la partida ya empezó.
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
        msg = "Ese código de sala ya está en uso. Intenta de nuevo.";
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
            new Error("No se pudo conectar. ¿El código es correcto y el anfitrión sigue en la sala?")
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
          callbacks.onError && callbacks.onError(new Error("La sala ya tiene 4 forajidos."));
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
        msg = "Campamento no encontrado. Revisa el código o pide al anfitrión que lo funde de nuevo.";
      }
      callbacks.onError && callbacks.onError(new Error(msg));
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
    if (peer) {
      peer.destroy();
    }
    peer = null;
    hostConn = null;
    hostConnections.clear();
    roster = new Map();
    isHost = false;
  }

  function getMyId() {
    return myId;
  }

  function getIsHost() {
    return isHost;
  }

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
  };
})();
