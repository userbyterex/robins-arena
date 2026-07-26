/**
 * client-sync.js — Snapshot interpolation for non-host clients.
 */
const ClientSync = (() => {
  let latest = null;
  const rendered = new Map();
  const SNAP_DISTANCE = 80;

  function init(onEvents) {
    Network.onMessage("snapshot", (msg) => {
      latest = msg;
      if (onEvents && msg.events && msg.events.length) onEvents(msg.events);
    });
  }

  function update() {
    if (!latest) return;
    for (const p of latest.players) {
      let r = rendered.get(p.id);
      if (!r) {
        r = { x: p.x, y: p.y };
        rendered.set(p.id, r);
        continue;
      }
      const dx = p.x - r.x;
      const dy = p.y - r.y;
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
    return latest.players.map((p) => {
      const r = rendered.get(p.id) || { x: p.x, y: p.y };
      return { ...p, x: r.x, y: r.y };
    });
  }

  function getProjectiles() {
    return latest ? latest.projectiles : [];
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

  return { init, update, getPlayers, getProjectiles, getKillfeed, isMatchOver, getWinnerName, getTimeLeft, hasReceivedFirstSnapshot };
})();
