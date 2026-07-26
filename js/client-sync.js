/**
 * client-sync.js — Snapshot interpolation (players + npcs + flags).
 * No template literals (paste-safe).
 */
const ClientSync = (() => {
  var latest = null;
  var rendered = new Map();
  var SNAP_DISTANCE = 80;

  function init(onEvents) {
    Network.onMessage("snapshot", function (msg) {
      latest = msg;
      if (onEvents && msg.events && msg.events.length) onEvents(msg.events);
    });
  }

  function update() {
    if (!latest) return;
    for (var i = 0; i < latest.players.length; i++) {
      var p = latest.players[i];
      var r = rendered.get(p.id);
      if (!r) {
        rendered.set(p.id, { x: p.x, y: p.y });
        continue;
      }
      var dx = p.x - r.x;
      var dy = p.y - r.y;
      if (dx * dx + dy * dy > SNAP_DISTANCE * SNAP_DISTANCE) {
        r.x = p.x;
        r.y = p.y;
      } else {
        r.x += dx * 0.35;
        r.y += dy * 0.35;
      }
    }
  }

  function getPlayers() {
    if (!latest) return [];
    return latest.players.map(function (p) {
      var r = rendered.get(p.id) || { x: p.x, y: p.y };
      return Object.assign({}, p, { x: r.x, y: r.y });
    });
  }

  function getProjectiles() {
    return latest ? latest.projectiles : [];
  }

  function getNpcs() {
    return latest && latest.npcs ? latest.npcs : [];
  }

  function getFlags() {
    return latest && latest.flags ? latest.flags : [];
  }

  function getKillfeed() {
    return latest ? latest.killfeed : [];
  }

  function isMatchOver() {
    return latest ? latest.matchOver : false;
  }

  function getWinnerName() {
    return latest ? latest.winnerName : null;
  }

  function getTimeLeft() {
    return latest ? latest.timeLeft : 0;
  }

  function hasReceivedFirstSnapshot() {
    return latest !== null;
  }

  return {
    init: init,
    update: update,
    getPlayers: getPlayers,
    getProjectiles: getProjectiles,
    getNpcs: getNpcs,
    getFlags: getFlags,
    getKillfeed: getKillfeed,
    isMatchOver: isMatchOver,
    getWinnerName: getWinnerName,
    getTimeLeft: getTimeLeft,
    hasReceivedFirstSnapshot: hasReceivedFirstSnapshot,
  };
})();
