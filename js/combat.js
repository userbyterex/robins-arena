/**
 * combat.js — Pure combat resolution (host only).
 */
var Combat = (function () {

  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  function tryMeleeAttack(attacker, players) {
    var weapon = WEAPONS[attacker.weapon];
    var events = [];
    var halfAngle = (weapon.angle * Math.PI) / 180 / 2;

    for (var i = 0; i < players.length; i++) {
      var target = players[i];
      if (target.id === attacker.id || !target.alive) continue;
      var dx = target.x - attacker.x;
      var dy = target.y - attacker.y;
      var dist = Math.hypot(dx, dy);
      if (dist > weapon.range + PLAYER_RADIUS) continue;
      var angleToTarget = Math.atan2(dy, dx);
      if (angleDiff(angleToTarget, attacker.angle) > halfAngle) continue;

      var killed = applyDamage(target, weapon.damage);
      events.push({ attackerId: attacker.id, targetId: target.id, weaponId: weapon.id, damage: weapon.damage, killed: killed, x: target.x, y: target.y });
    }
    return events;
  }

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

  function updateProjectiles(projectiles, players, dt) {
    var survivors = [];
    var events = [];

    for (var i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ttl -= dt;

      if (p.ttl <= 0 || GameMap.pointBlocked(p.x, p.y)) continue;

      var hit = false;
      for (var j = 0; j < players.length; j++) {
        var target = players[j];
        if (target.id === p.ownerId || !target.alive) continue;
        var dist = Math.hypot(target.x - p.x, target.y - p.y);
        if (dist <= PLAYER_RADIUS + p.radius) {
          var killed = applyDamage(target, p.damage);
          events.push({ attackerId: p.ownerId, targetId: target.id, weaponId: p.weaponId, damage: p.damage, killed: killed, x: target.x, y: target.y });
          hit = true;
          break;
        }
      }
      if (!hit) survivors.push(p);
    }
    return { survivors: survivors, events: events };
  }

  function processRespawns(players, spawnAssignment) {
    var now = performance.now() / 1000;
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (!p.alive && Number.isFinite(p.respawnAt) && now >= p.respawnAt) {
        var idx = spawnAssignment.get(p.id);
        var spawn = GameMap.SPAWNS[(idx != null ? idx : 0) % GameMap.SPAWNS.length];
        p.x = spawn.x;
        p.y = spawn.y;
        p.hp = MAX_HP;
        p.alive = true;
      }
    }
  }

  return { tryMeleeAttack: tryMeleeAttack, applyDamage: applyDamage, updateProjectiles: updateProjectiles, processRespawns: processRespawns };
})();
