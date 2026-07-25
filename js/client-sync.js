/**
 * client-sync.js
 * Solo se usa en los navegadores que NO son el host. Recibe snapshots (20/seg)
 * y suaviza la posición de los jugadores entre uno y otro para que el
 * movimiento no se vea "a saltos".
 */
const ClientSync = (() => {
  let latest = null;
  const rendered = new Map(); // id -> {x,y} posición suavizada actual

  function init(onEvents) {
    Network.onMessage("snapshot", (msg) => {
      latest = msg;
      if (onEvents && msg.events && msg.events.length) onEvents(msg.events);
    });
  }

  // Se llama cada frame de render (60/seg) para acercar las posiciones
  // dibujadas hacia el último snapshot recibido (interpolación simple).
  function update() {
    if (!latest) return;
    for (const p of latest.players) {
      const r = rendered.get(p.id) || { x: p.x, y: p.y };
      r.x += (p.x - r.x) * 0.35;
      r.y += (p.y - r.y) * 0.35;
      rendered.set(p.id, r);
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
