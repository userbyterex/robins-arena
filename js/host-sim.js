/**
 * host-sim.js
 * Única fuente de verdad de la partida. Solo corre en el navegador del host.
 * Recibe inputs de todos (incluido el propio host) y produce snapshots.
 */
const HostSim = (() => {
  const TICK_RATE = 20; // ticks/seg
  const MATCH_DURATION = 180; // segundos
  const SCORE_TO_WIN = 5;

  let players = new Map();      // id -> player
  let projectiles = [];
  let inputs = new Map();       // id -> último input recibido
  let spawnAssignment = new Map(); // id -> índice de spawn (para respawns)
  let killfeed = [];            // {killerName, targetName, weaponId, at}
  let matchStartTime = 0;
  let matchOver = false;
  let winnerName = null;
  let tickEvents = [];           // eventos de ESTE tick, para sonido (kind: 'melee'|'ranged'|'hit'|'death')

  function init(playerConfigs) {
    // playerConfigs: [{id, name, colorIndex, spawnIndex}]
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

  function tick(dt) {
    tickEvents = [];
    if (matchOver) return;
    const now = performance.now() / 1000;

    for (const player of players.values()) {
      const input = inputs.get(player.id);
      if (!input || !player.alive) continue;

      // Movimiento
      const nx = player.x + input.dx * PLAYER_SPEED * dt;
      const ny = player.y + input.dy * PLAYER_SPEED * dt;
      const resolved = GameMap.resolveCircleCollision(nx, ny, PLAYER_RADIUS);
      player.x = resolved.x;
      player.y = resolved.y;
      player.angle = input.angle;

      // Cambio de arma
      if (input.weapon && WEAPONS[input.weapon]) player.weapon = input.weapon;

      // Ataque
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

    // Proyectiles
    const { survivors, events } = Combat.updateProjectiles(projectiles, Array.from(players.values()), dt);
    projectiles = survivors;
    registerEvents(events);

    // Respawns
    Combat.processRespawns(Array.from(players.values()), Object.fromEntries(spawnAssignment));

    // Condición de victoria
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
      winnerName = best ? best.name : "Nadie";
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

  return { init, setInput, tick, getState, getSnapshotPayload, getTickEvents, TICK_RATE };
})();
