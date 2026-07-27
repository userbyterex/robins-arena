/**
 * network.js — PeerJS lobby (classic script, no export).
 * Shows camp code immediately; retries if PeerJS ID is taken.
 */
const Network = (() => {
  var MAX_PLAYERS = 6;
  var ID_PREFIX = "ra-";
  var JOIN_TIMEOUT_MS = 15000;
  var REGISTRY_TTL_MS = 90000;

  var peer = null;
  var isHost = false;
  var myName = "";
  var myId = null;
  var hostConnections = new Map();
  var roster = new Map();
  var hostConn = null;
  var joinTimeoutId = null;
  var callbacks = {};
  var messageHandlers = {};
  var discoverPeer = null;
  var registryAnnounceTimer = null;
  var currentCode = "";
  var hostAttempts = 0;

  function loadLocalRegistry() {
    try {
      var raw = localStorage.getItem("ra_open_camps");
      if (!raw) return {};
      var data = JSON.parse(raw);
      var now = Date.now();
      var cleaned = {};
      for (var code in data) {
        if (data[code] && data[code].expires > now) cleaned[code] = data[code];
      }
      return cleaned;
    } catch (e) {
      return {};
    }
  }

  function saveLocalRegistry(map) {
    try {
      localStorage.setItem("ra_open_camps", JSON.stringify(map));
    } catch (e) {}
  }

  function registerCampLocal(code, hostName, players) {
    var map = loadLocalRegistry();
    map[code] = {
      code: code,
      hostName: hostName || "Host",
      players: players || 1,
      max: MAX_PLAYERS,
      expires: Date.now() + REGISTRY_TTL_MS,
    };
    saveLocalRegistry(map);
  }

  function unregisterCampLocal(code) {
    var map = loadLocalRegistry();
    delete map[code];
    saveLocalRegistry(map);
  }

  function onMessage(type, handler) {
    messageHandlers[type] = handler;
  }

  function ensurePeerJS() {
    if (typeof Peer === "undefined") {
      if (callbacks.onError) {
        callbacks.onError(new Error("PeerJS failed to load. Disable adblock / check internet."));
      }
      return false;
    }
    return true;
  }

  function send(msg) {
    if (isHost) {
      hostConnections.forEach(function (entry) {
        if (entry.conn && entry.conn.open) entry.conn.send(msg);
      });
    } else if (hostConn && hostConn.open) {
      hostConn.send(msg);
    }
  }

  function randomCode() {
    var letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    var code = "";
    for (var i = 0; i < 4; i++) {
      code += letters[Math.floor(Math.random() * letters.length)];
    }
    return code;
  }

  function rosterList() {
    var list = [];
    roster.forEach(function (p, id) {
      list.push({ id: id, name: p.name, team: p.team });
    });
    return list;
  }

  function broadcastRoster() {
    var list = rosterList();
    hostConnections.forEach(function (entry) {
      if (entry.conn && entry.conn.open) {
        entry.conn.send({ type: "roster", list: list });
      }
    });
    if (callbacks.onRosterUpdate) callbacks.onRosterUpdate(list);
    if (isHost && currentCode) registerCampLocal(currentCode, myName, roster.size);
  }

  function attachHostConnHandlers(conn) {
    conn.on("data", function (msg) {
      if (msg.type === "join") {
        if (roster.size >= MAX_PLAYERS) {
          conn.send({ type: "room-full" });
          conn.close();
          return;
        }
        roster.set(conn.peer, { name: msg.name || "Player", team: roster.size % 2 });
        hostConnections.set(conn.peer, { conn: conn, name: msg.name });
        broadcastRoster();
      } else if (messageHandlers[msg.type]) {
        messageHandlers[msg.type](msg, conn.peer);
      }
    });
    conn.on("close", function () {
      roster.delete(conn.peer);
      hostConnections.delete(conn.peer);
      broadcastRoster();
      if (messageHandlers["peer-left"]) {
        messageHandlers["peer-left"]({ type: "peer-left", peerId: conn.peer });
      }
    });
    conn.on("error", function (err) {
      console.warn("Host conn error", err);
    });
  }

  function startRegistryAnnounce(code) {
    stopRegistryAnnounce();
    currentCode = code;
    registerCampLocal(code, myName, roster.size || 1);
    registryAnnounceTimer = setInterval(function () {
      if (isHost && currentCode) registerCampLocal(currentCode, myName, roster.size);
    }, 20000);
  }

  function stopRegistryAnnounce() {
    if (registryAnnounceTimer) {
      clearInterval(registryAnnounceTimer);
      registryAnnounceTimer = null;
    }
    if (currentCode) unregisterCampLocal(currentCode);
    currentCode = "";
  }

  function destroyPeerQuiet() {
    try {
      if (peer) peer.destroy();
    } catch (e) {}
    peer = null;
  }

  function startHostPeer(code) {
    destroyPeerQuiet();
    var peerId = ID_PREFIX + code;

    try {
      peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        }
      });
    } catch (e) {
      if (callbacks.onError) callbacks.onError(e);
      return;
    }

    var opened = false;

    peer.on("open", function (id) {
      opened = true;
      myId = id;
      roster = new Map();
      roster.set(id, { name: myName, team: 0 });
      startRegistryAnnounce(code);
      console.log("[Network] Host ready, code=", code, "id=", id);
      if (callbacks.onHostReady) callbacks.onHostReady(code);
      broadcastRoster();
    });

    peer.on("connection", function (conn) {
      attachHostConnHandlers(conn);
    });

    peer.on("error", function (err) {
      console.error("[Network] Peer error", err && err.type, err);
      var t = err && err.type ? err.type : "";
      if (t === "unavailable-id" && hostAttempts < 5) {
        hostAttempts++;
        var newCode = randomCode();
        console.log("[Network] ID taken, retry with", newCode);
        if (callbacks.onHostReady) callbacks.onHostReady(newCode);
        startHostPeer(newCode);
        return;
      }
      if (t === "network" || t === "server-error" || t === "socket-error") {
        if (callbacks.onError) {
          callbacks.onError(new Error("Cannot reach PeerJS server. Check internet / VPN / firewall."));
        }
        return;
      }
      if (!opened && callbacks.onError) {
        callbacks.onError(new Error(err && err.message ? err.message : String(err)));
      }
    });
  }

  function hostRoom(name, cbs) {
    callbacks = cbs || {};
    isHost = true;
    myName = name || "Host";
    roster = new Map();
    hostAttempts = 0;
    hostConnections.clear();

    if (!ensurePeerJS()) return;

    var code = randomCode();
    // Show code immediately so UI is not stuck on ----
    currentCode = code;
    if (callbacks.onHostReady) callbacks.onHostReady(code);
    startHostPeer(code);
  }

  function joinRoom(code, name, cbs) {
    callbacks = cbs || {};
    isHost = false;
    myName = name || "Player";

    if (!ensurePeerJS()) return;
    if (joinTimeoutId) clearTimeout(joinTimeoutId);

    destroyPeerQuiet();

    try {
      peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        }
      });
    } catch (e) {
      if (callbacks.onError) callbacks.onError(e);
      return;
    }

    peer.on("open", function (id) {
      myId = id;
      var targetId = ID_PREFIX + String(code).toUpperCase();
      console.log("[Network] Joining", targetId, "as", id);
      var conn = peer.connect(targetId, { reliable: true });
      hostConn = conn;

      joinTimeoutId = setTimeout(function () {
        if (!conn.open) {
          if (callbacks.onError) {
            callbacks.onError(new Error("Could not connect. Is the code correct and is the host online?"));
          }
          try { conn.close(); } catch (e) {}
        }
      }, JOIN_TIMEOUT_MS);

      conn.on("open", function () {
        if (joinTimeoutId) {
          clearTimeout(joinTimeoutId);
          joinTimeoutId = null;
        }
        conn.send({ type: "join", name: myName });
        if (callbacks.onJoined) callbacks.onJoined(String(code).toUpperCase());
      });

      conn.on("data", function (msg) {
        if (msg.type === "roster") {
          if (callbacks.onRosterUpdate) callbacks.onRosterUpdate(msg.list);
        } else if (msg.type === "room-full") {
          if (callbacks.onError) callbacks.onError(new Error("This camp is full."));
        } else if (msg.type === "start") {
          if (callbacks.onStartGame) callbacks.onStartGame(msg.payload);
        } else if (messageHandlers[msg.type]) {
          messageHandlers[msg.type](msg);
        }
      });

      conn.on("close", function () {
        if (callbacks.onHostLeft) callbacks.onHostLeft();
      });

      conn.on("error", function (err) {
        console.warn("[Network] join conn error", err);
        if (callbacks.onError) callbacks.onError(err);
      });
    });

    peer.on("error", function (err) {
      console.error("[Network] join peer error", err);
      var msg = err && err.message ? err.message : String(err);
      if (err && (err.type === "peer-unavailable" || err.type === "network")) {
        msg = "Camp not found. Check the code or ask the host to create it again.";
      }
      if (callbacks.onError) callbacks.onError(new Error(msg));
    });
  }

  function listOpenCamps() {
    return new Promise(function (resolve) {
      var local = loadLocalRegistry();
      var fromLocal = [];
      for (var k in local) {
        fromLocal.push({
          code: local[k].code,
          hostName: local[k].hostName,
          players: local[k].players,
          max: local[k].max || MAX_PLAYERS,
        });
      }

      function merge(peerList) {
        var byCode = {};
        fromLocal.forEach(function (c) { byCode[c.code] = c; });
        (peerList || []).forEach(function (c) {
          if (!byCode[c.code]) byCode[c.code] = c;
        });
        var out = [];
        for (var code in byCode) out.push(byCode[code]);
        resolve(out);
      }

      if (typeof Peer === "undefined") {
        merge([]);
        return;
      }

      function runList(p) {
        if (typeof p.listAllPeers !== "function") {
          merge([]);
          return;
        }
        try {
          p.listAllPeers(function (all) {
            var camps = (all || [])
              .filter(function (id) {
                return typeof id === "string" && id.indexOf(ID_PREFIX) === 0 && id.length === ID_PREFIX.length + 4;
              })
              .map(function (id) {
                return {
                  id: id,
                  code: id.slice(ID_PREFIX.length).toUpperCase(),
                  hostName: "Host",
                  players: "?",
                  max: MAX_PLAYERS,
                };
              });
            merge(camps);
          });
        } catch (e) {
          merge([]);
        }
      }

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
        var t = setTimeout(function () { merge([]); }, 5000);
        discoverPeer.on("open", function () {
          clearTimeout(t);
          runList(discoverPeer);
        });
        discoverPeer.on("error", function () {
          clearTimeout(t);
          merge([]);
        });
      } catch (e) {
        merge([]);
      }
    });
  }

  function startGame(payload) {
    if (!isHost) return;
    stopRegistryAnnounce();
    hostConnections.forEach(function (entry) {
      if (entry.conn && entry.conn.open) {
        entry.conn.send({ type: "start", payload: payload });
      }
    });
    if (callbacks.onStartGame) callbacks.onStartGame(payload);
  }

  function leaveRoom() {
    if (joinTimeoutId) {
      clearTimeout(joinTimeoutId);
      joinTimeoutId = null;
    }
    stopRegistryAnnounce();
    destroyPeerQuiet();
    hostConn = null;
    hostConnections.clear();
    roster = new Map();
    isHost = false;
  }

  function getMyId() { return myId; }
  function getIsHost() { return isHost; }

  return {
    MAX_PLAYERS: MAX_PLAYERS,
    hostRoom: hostRoom,
    joinRoom: joinRoom,
    startGame: startGame,
    leaveRoom: leaveRoom,
    getMyId: getMyId,
    getIsHost: getIsHost,
    onMessage: onMessage,
    send: send,
    listOpenCamps: listOpenCamps,
  };
})();
