/**
 * network.js — P2P multiplayer via PeerJS.
 * Hosts register in localStorage for "camp discovery".
 */

var Network = (function () {
  var peer = null;
  var connections = [];
  var roomCode = null;
  var isHost = false;
  var msgHandlers = {};
  var localName = "";
  var onPlayerJoinCb = null;
  var onPlayerLeaveCb = null;
  var onStartCb = null;
  var onErrorCb = null;
  var onCloseCb = null;
  var hostConn = null;

  function generateCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    var code = "";
    for (var i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  function getMyId() {
    if (peer) return peer.id;
    return "local-" + Math.floor(Math.random() * 1000000);
  }

  function getRoomCode() {
    return roomCode;
  }

  function broadcast(msg) {
    for (var i = 0; i < connections.length; i++) {
      try { connections[i].send(msg); } catch (e) {}
    }
  }

  function handleMessage(data, fromId) {
    if (!data || !data.type) return;
    if (msgHandlers[data.type]) {
      msgHandlers[data.type](data, fromId);
    }
    if (data.type === "snapshot" && !isHost) {
      if (msgHandlers["snapshot"]) msgHandlers["snapshot"](data, fromId);
    }
  }

  function addConnection(conn) {
    connections.push(conn);
    conn.on("data", function (data) { handleMessage(data, conn.peer); });
    conn.on("close", function () {
      connections = connections.filter(function (c) { return c !== conn; });
      if (onPlayerLeaveCb) onPlayerLeaveCb(conn.peer);
    });
    conn.on("error", function (err) {
      console.warn("Peer connection error:", err);
    });
  }

  function hostRoom(name, callbacks) {
    isHost = true;
    localName = name;
    roomCode = generateCode();
    callbacks = callbacks || {};
    onPlayerJoinCb = callbacks.onPlayerJoin || null;
    onPlayerLeaveCb = callbacks.onPlayerLeave || null;
    onStartCb = callbacks.onStart || null;
    onErrorCb = callbacks.onError || null;
    onCloseCb = callbacks.onClose || null;

    try {
      peer = new Peer("ra-host-" + roomCode + "-" + Date.now(), {
        host: "0.peerjs.com",
        port: 443,
        secure: true,
        config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
      });
    } catch (e) {
      if (onErrorCb) onErrorCb(e);
      return;
    }

    peer.on("open", function () {
      try {
        localStorage.setItem("ra-camp-" + roomCode, JSON.stringify({
          code: roomCode,
          name: name,
          ts: Date.now()
        }));
      } catch (e) {}
    });

    peer.on("connection", function (conn) {
      addConnection(conn);
      conn.on("open", function () {
        if (onPlayerJoinCb) onPlayerJoinCb(conn.peer, conn.metadata && conn.metadata.name ? conn.metadata.name : "Hunter");
      });
    });

    peer.on("error", function (err) {
      if (onErrorCb) onErrorCb(err);
    });

    peer.on("disconnected", function () {
      if (onCloseCb) onCloseCb();
    });
  }

  function joinRoom(code, name, callbacks) {
    isHost = false;
    localName = name;
    roomCode = code.toUpperCase();
    callbacks = callbacks || {};
    onStartCb = callbacks.onStart || null;
    onErrorCb = callbacks.onError || null;
    onCloseCb = callbacks.onClose || null;

    try {
      peer = new Peer("ra-client-" + Date.now(), {
        host: "0.peerjs.com",
        port: 443,
        secure: true,
        config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
      });
    } catch (e) {
      if (onErrorCb) onErrorCb(e);
      return;
    }

    peer.on("open", function () {
      var hostId = "ra-host-" + roomCode;
      var conn = peer.connect(hostId, { metadata: { name: name } });
      hostConn = conn;
      conn.on("open", function () {
        addConnection(conn);
        conn.send({ type: "hello", name: name });
      });
      conn.on("data", function (data) {
        handleMessage(data, conn.peer);
      });
      conn.on("close", function () {
        if (onCloseCb) onCloseCb();
      });
      conn.on("error", function (err) {
        if (onErrorCb) onErrorCb(err);
      });
    });

    peer.on("error", function (err) {
      if (onErrorCb) onErrorCb(err);
    });

    onMessage("start_game", function (msg) {
      if (onStartCb) onStartCb(msg.payload || {});
    });

    onMessage("roster_update", function (msg) {
      if (msgHandlers["roster_update"]) msgHandlers["roster_update"](msg);
    });
  }

  function listOpenCamps() {
    var camps = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf("ra-camp-") === 0) {
          var camp = JSON.parse(localStorage.getItem(key));
          if (camp && camp.code && camp.name && camp.ts && Date.now() - camp.ts < 10 * 60 * 1000) {
            camps.push(camp);
          }
        }
      }
    } catch (e) {}
    return camps;
  }

  function startGame(payload) {
    if (!isHost) return;
    broadcast({ type: "start_game", payload: payload });
    if (onStartCb) onStartCb(payload);
  }

  function leaveRoom() {
    try {
      if (roomCode) localStorage.removeItem("ra-camp-" + roomCode);
    } catch (e) {}
    connections.forEach(function (c) { try { c.close(); } catch (e) {} });
    connections = [];
    if (peer) { try { peer.destroy(); } catch (e) {} }
    peer = null;
    roomCode = null;
    isHost = false;
    hostConn = null;
  }

  function send(msg) {
    if (isHost) {
      broadcast(msg);
    } else if (hostConn && hostConn.open) {
      try { hostConn.send(msg); } catch (e) {}
    }
  }

  function onMessage(type, handler) {
    msgHandlers[type] = handler;
  }

  return {
    hostRoom: hostRoom,
    joinRoom: joinRoom,
    listOpenCamps: listOpenCamps,
    startGame: startGame,
    leaveRoom: leaveRoom,
    send: send,
    onMessage: onMessage,
    getMyId: getMyId,
    getRoomCode: getRoomCode
  };
})();
