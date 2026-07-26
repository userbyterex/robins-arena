/**
 * host-sim.js — Authoritative simulation (host only).
 */
const HostSim = (() => {
  const TICK_RATE = 20;
  const MATCH_DURATION = 180;
  const SCORE_TO_WIN = 5;

  let players = new Map();
  let projectiles = [];
  let inputs = new Map();
  let spawnAssignment = new Map();
  let killfeed = [];
  let matchStartTime = 0;
  let matchOver = false;
  let winnerName = null;
  let tickEvents = [];

  function init(playerConfigs) {
    players = new Map();
    spawnAssignment = new Map();
    playerConfigs.forEach((cfg) => {
      players.set(cfg.id, createPlayer(cfg.id, cfg.name, cfg.colorIndex, cfg.spawnIndex));
      spawnAssignment.set(cfg.id, cfg.spawnIndex);
    });
    projectiles = [];
    inputs = new Map();
    killfeed = [];
    matchStartTime = performance.now() / 1000;
    matchOver = false;
    winnerName = null;
  }

  function setInput(id, input) {
    inputs.set(id, input);
  }

  function markDisconnected(peerId) {
    const p = players.get(peerId);
    if (!p) return;
    p.alive = false;
    p.hp = 0;
    p.respawnAt = Infinity;
    inputs.delete(peerId);
  }

  function tick(dt) {
    tickEvents = [];
    if (matchOver) return;
    const now = performance.now() / 1000;

    for (const player of players.values()) {
      const input = inputs.get(player.id);
      if (!input || !player.alive) continue;

      const nx = player.x + input.dx * PLAYER_SPEED * dt;
      const ny = player.y + input.dy * PLAYER_SPEED * dt;
      const resolved = GameMap.resolveCircleCollision(nx, ny, PLAYER_RADIUS);
      player.x = resolved.x;
      player.y = resolved.y;
      player.angle = input.angle;

      if (input.weapon && WEAPONS[input.weapon]) player.weapon = input.weapon;

      if (input.attack) {
        const weapon = WEAPONS[player.weapon];
        if (now - player.lastAttackAt >= weapon.cooldown) {
          player.lastAttackAt = now;
          player.lastAttackAnimAt = now;
          if (weapon.type === "melee") {
            tickEvents.push({ kind: "melee", weaponId: weapon.id, x: player.x, y: player.y, angle: player.angle });
            const events = Combat.tryMeleeAttack(player, Array.from(players.values()));
            registerEvents(events);
          } else {
            tickEvents.push({ kind: "ranged", weaponId: weapon.id, x: player.x, y: player.y, angle: player.angle });
            projectiles.push(createProjectile(player, player.weapon));
          }
        }
      }
    }

    const { survivors, events } = Combat.updateProjectiles(projectiles, Array.from(players.values()), dt);
    projectiles = survivors;
    registerEvents(events);

    Combat.processRespawns(Array.from(players.values()), Object.fromEntries(spawnAssignment));

    for (const p of players.values()) {
      if (p.score >= SCORE_TO_WIN) {
        matchOver = true;
        winnerName = p.name;
      }
    }
    if (!matchOver && now - matchStartTime >= MATCH_DURATION) {
      matchOver = true;
      let best = null;
      for (const p of players.values()) if (!best || p.score > best.score) best = p;
      winnerName = best ? best.name : "Nobody";
    }
  }

  function registerEvents(events) {
    const now = performance.now() / 1000;
    for (const ev of events) {
      tickEvents.push({ kind: "hit", x: ev.x, y: ev.y });
      if (ev.killed) {
        tickEvents.push({ kind: "death", x: ev.x, y: ev.y });
        const attacker = players.get(ev.attackerId);
        const target = players.get(ev.targetId);
        if (attacker) attacker.score += 1;
        killfeed.unshift({
          killerName: attacker ? attacker.name : "?",
          targetName: target ? target.name : "?",
          weaponId: ev.weaponId,
          at: now,
        });
        killfeed = killfeed.slice(0, 5);
      }
    }
  }

  function getState() {
    return {
      players: Array.from(players.values()),
      projectiles,
      killfeed,
      matchOver,
      winnerName,
      timeLeft: Math.max(0, MATCH_DURATION - (performance.now() / 1000 - matchStartTime)),
    };
  }

  function getSnapshotPayload() {
    const s = getState();
    return {
      type: "snapshot",
      players: s.players.map((p) => ({
        id: p.id, name: p.name, colorIndex: p.colorIndex,
        x: p.x, y: p.y, angle: p.angle, hp: p.hp, weapon: p.weapon,
        alive: p.alive, score: p.score,
        lastHitFlashAt: p.lastHitFlashAt, lastAttackAnimAt: p.lastAttackAnimAt,
      })),
      projectiles: s.projectiles.map((p) => ({ id: p.id, x: p.x, y: p.y, angle: p.angle, weaponId: p.weaponId })),
      killfeed: s.killfeed,
      matchOver: s.matchOver,
      winnerName: s.winnerName,
      timeLeft: s.timeLeft,
      events: tickEvents,
    };
  }

  function getTickEvents() {
    return tickEvents;
  }

  return { init, setInput, tick, getState, getSnapshotPayload, getTickEvents, markDisconnected, TICK_RATE };
})();
