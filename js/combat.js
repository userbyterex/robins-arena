/**
 * combat.js
 * Funciones puras (o casi) de resolución de combate. Usadas exclusivamente
 * por host-sim.js, que es la única simulación autoritativa.
 */
const Combat = (() => {

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  // Intenta un golpe cuerpo a cuerpo del atacante contra todos los demás jugadores vivos.
  // Devuelve una lista de eventos {targetId, damage, killed}.
  function tryMeleeAttack(attacker, players) {
    const weapon = WEAPONS[attacker.weapon];
    const events = [];
    const halfAngle = (weapon.angle * Math.PI) / 180 / 2;

    for (const target of players) {
      if (target.id === attacker.id || !target.alive) continue;
      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const dist = Math.hypot(dx, dy);
      if (dist > weapon.range + PLAYER_RADIUS) continue;
      const angleToTarget = Math.atan2(dy, dx);
      if (angleDiff(angleToTarget, attacker.angle) > halfAngle) continue;

      const killed = applyDamage(target, weapon.damage);
      events.push({ attackerId: attacker.id, targetId: target.id, weaponId: weapon.id, damage: weapon.damage, killed, x: target.x, y: target.y });
    }
    return events;
  }

  // Aplica daño a un jugador; devuelve true si murió con este golpe.
  function applyDamage(target, amount) {
    target.hp = Math.max(0, target.hp - amount);
    target.lastHitFlashAt = performance.now() / 1000;
    if (target.hp === 0 && target.alive) {
      target.alive = false;
      target.respawnAt = performance.now() / 1000 + RESPAWN_SECONDS;
      return true;
    }
    return false;
  }

  // Actualiza todos los proyectiles: movimiento, colisión con obstáculos y jugadores.
  // Devuelve {survivors, events} donde events son impactos {attackerId,targetId,weaponId,damage,killed}.
  function updateProjectiles(projectiles, players, dt) {
    const survivors = [];
    const events = [];

    for (const p of projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ttl -= dt;

      if (p.ttl <= 0 || GameMap.pointBlocked(p.x, p.y)) continue; // se descarta

      let hit = false;
      for (const target of players) {
        if (target.id === p.ownerId || !target.alive) continue;
        const dist = Math.hypot(target.x - p.x, target.y - p.y);
        if (dist <= PLAYER_RADIUS + p.radius) {
          const killed = applyDamage(target, p.damage);
          events.push({ attackerId: p.ownerId, targetId: target.id, weaponId: p.weaponId, damage: p.damage, killed, x: target.x, y: target.y });
          hit = true;
          break;
        }
      }
      if (!hit) survivors.push(p);
    }
    return { survivors, events };
  }

  // Revisa respawns pendientes. respawnAt = Infinity => desconectado, no revive.
  function processRespawns(players, spawnAssignment) {
    const now = performance.now() / 1000;
    for (const p of players) {
      if (!p.alive && Number.isFinite(p.respawnAt) && now >= p.respawnAt) {
        const idx = spawnAssignment[p.id];
        const spawn = GameMap.SPAWNS[(idx != null ? idx : 0) % GameMap.SPAWNS.length];
        p.x = spawn.x;
        p.y = spawn.y;
        p.hp = MAX_HP;
        p.alive = true;
      }
    }
  }

  return { tryMeleeAttack, applyDamage, updateProjectiles, processRespawns };
})();
