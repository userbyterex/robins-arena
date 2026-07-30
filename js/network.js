/**
 * network.js — P2P multiplayer via PeerJS (fixed + viral-ready).
 * Host ID is deterministic: "ra-host-" + CODE
 */
var Network = (function () {
  var peer = null;
  var connections = [];
  var roomCode = null;
  var isHost = false;
  var msgHandlers = {};
  var localName = "";
  var localClassId = "warrior";
  var localAppearance = null;
  var onPlayerJoinCb = null;
  var onPlayerLeaveCb = null;
  var onStartCb = null;
  var onErrorCb = null;
  var onCloseCb = null;
  var hostConn = null;
  var rosterMap = {}; // peerId -> { id, name, classId, appearance }

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
      try {
        if (connections[i].open) connections[i].send(msg);
      } catch (e) {}
    }
  }

  function handleMessage(data, fromId) {
    if (!data || !data.type) return;

    if (data.type === "hello" && isHost) {
      var name = data.name || "Hunter";
      var classId = data.classId || "warrior";
      var appearance = data.appearance || null;
      rosterMap[fromId] = {
        id: fromId,
        name: name,
        classId: classId,
        appearance: appearance
      };
      if (onPlayerJoinCb) onPlayerJoinCb(fromId, name, classId, appearance);
      return;
    }

    if (msgHandlers[data.type]) {
      msgHandlers[data.type](data, fromId);
    }
  }

  function addConnection(conn) {
    connections.push(conn);
    conn.on("data", function (data) {
      handleMessage(data, conn.peer);
    });
    conn.on("close", function () {
      connections = connections.filter(function (c) { return c !== conn; });
      if (rosterMap[conn.peer]) delete rosterMap[conn.peer];
      if (onPlayerLeaveCb) onPlayerLeaveCb(conn.peer);
    });
    conn.on("error", function (err) {
      console.warn("Peer connection error:", err);
    });
  }

  function hostRoom(name, callbacks, classId, appearance) {
    isHost = true;
    localName = name;
    localClassId = classId || "warrior";
    localAppearance = appearance || null;
    roomCode = generateCode();
    callbacks = callbacks || {};
    onPlayerJoinCb = callbacks.onPlayerJoin || null;
    onPlayerLeaveCb = callbacks.onPlayerLeave || null;
    onStartCb = callbacks.onStart || null;
    onErrorCb = callbacks.onError || null;
    onCloseCb = callbacks.onClose || null;
    rosterMap = {};

    try {
      // Deterministic ID so clients can find the host
      peer = new Peer("ra-host-" + roomCode, {
        host: "0.peerjs.com",
        port: 443,
        secure: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      });
    } catch (e) {
      if (onErrorCb) onErrorCb(e);
      return;
    }

    peer.on("open", function (id) {
      console.log("Host ready:", id);
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
        // Wait for "hello" message with full player data
      });
    });

    peer.on("error", function (err) {
      console.error("Peer error:", err);
      if (err.type === "unavailable-id") {
        // Code already taken → generate new one
        roomCode = generateCode();
        if (onErrorCb) onErrorCb(new Error("Code taken, try again"));
      } else if (onErrorCb) {
        onErrorCb(err);
      }
    });

    peer.on("disconnected", function () {
      if (onCloseCb) onCloseCb();
    });
  }

  function joinRoom(code, name, callbacks, classId, appearance) {
    isHost = false;
    localName = name;
    localClassId = classId || "warrior";
    localAppearance = appearance || null;
    roomCode = code.toUpperCase().trim();
    callbacks = callbacks || {};
    onStartCb = callbacks.onStart || null;
    onErrorCb = callbacks.onError || null;
    onCloseCb = callbacks.onClose || null;

    try {
      peer = new Peer("ra-client-" + Date.now() + "-" + Math.floor(Math.random() * 9999), {
        host: "0.peerjs.com",
        port: 443,
        secure: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      });
    } catch (e) {
      if (onErrorCb) onErrorCb(e);
      return;
    }

    peer.on("open", function () {
      var hostId = "ra-host-" + roomCode;
      var conn = peer.connect(hostId, {
        metadata: { name: name },
        reliable: true
      });
      hostConn = conn;

      conn.on("open", function () {
        addConnection(conn);
        // Send full player info
        conn.send({
          type: "hello",
          name: name,
          classId: localClassId,
          appearance: localAppearance
        });
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
    connections.forEach(function (c) {
      try { c.close(); } catch (e) {}
    });
    connections = [];
    if (peer) {
      try { peer.destroy(); } catch (e) {}
    }
    peer = null;
    roomCode = null;
    isHost = false;
    hostConn = null;
    rosterMap = {};
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

  function getRosterMap() {
    return rosterMap;
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
    getRoomCode: getRoomCode,
    getRosterMap: getRosterMap
  };
})();
