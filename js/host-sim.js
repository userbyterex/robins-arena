/**
 * host-sim.js — Conquest + class abilities (Warrior/Ranger/Mage/Monk).
 * Paste-safe.
 */
var HostSim = (function () {
  var TICK_RATE = 20;
  var MATCH_DURATION = 480;
  var CAPTURE_TIME = 3.0;
  var NPC_PER_ZONE = 3;
  var SPAWN_INTERVAL = 5.0;
  var HQ_MAX_HP = 280;
  var RAM_STRUCTURE_DAMAGE = 22;

  var players = new Map();
  var projectiles = [];
  var npcs = [];
  var inputs = new Map();
  var spawnAssignment = new Map();
  var killfeed = [];
  var matchStartTime = 0;
  var matchOver = false;
  var winnerName = null;
  var tickEvents = [];
  var flags = [];
  var towerCooldown = {};
  var zoneSpawnTimer = {};
  var npcIdCounter = 1;

  var ZONE_FLAVOR = {
    nymphs: {
      name: "Nymphs Grove",
      units: [
        { name: "Sprite", hp: 35, speed: 155, damage: 10, range: 32, color: "#7dcea0" },
        { name: "Dryad", hp: 55, speed: 130, damage: 15, range: 36, color: "#52b788" },
        { name: "Grove Ram", hp: 170, speed: 62, damage: 8, range: 42, isRam: true, color: "#2d6a4f" },
      ],
    },
    village: {
      name: "Village",
      units: [
        { name: "Militia", hp: 48, speed: 125, damage: 13, range: 34, color: "#c9a227" },
        { name: "Captain", hp: 70, speed: 110, damage: 17, range: 38, color: "#b08900" },
        { name: "War Ram", hp: 190, speed: 58, damage: 10, range: 44, isRam: true, color: "#7a5c00" },
      ],
    },
    outpost: {
      name: "Outpost",
      units: [
        { name: "Sentry", hp: 42, speed: 140, damage: 12, range: 34, color: "#7aa2c8" },
        { name: "Knight", hp: 75, speed: 105, damage: 19, range: 40, color: "#4a7ab0" },
        { name: "Siege Ram", hp: 210, speed: 55, damage: 12, range: 46, isRam: true, color: "#2c4a6e" },
      ],
    },
  };

  function moveEntity(x, y, dx, dy, radius) {
    if (GameMap.tryMove) return GameMap.tryMove(x, y, dx, dy, radius);
    return GameMap.resolveCircleCollision(x + dx, y + dy, radius);
  }

  function init(playerConfigs) {
    players = new Map();
    spawnAssignment = new Map();
    playerConfigs.forEach(function (cfg, i) {
      var team = cfg.team != null ? cfg.team : (i % 2);
      var classId = cfg.classId || "warrior";
      var cls = (typeof getClass === "function") ? getClass(classId) : { maxHp: 100, speedMul: 1, weapon: "sword", ability: { cooldown: 8 } };
      var spawnPool = GameMap.SPAWNS.filter(function (s) { return s.team === team; });
      var spawn = spawnPool[i % spawnPool.length] || GameMap.SPAWNS[0];
      var p = createPlayer(cfg.id, cfg.name, cfg.colorIndex != null ? cfg.colorIndex : i, 0);
      p.x = spawn.x;
      p.y = spawn.y;
      p.team = team;
      p.classId = classId;
      p.maxHp = cls.maxHp || MAX_HP;
      p.hp = p.maxHp;
      p.speedMul = cls.speedMul || 1;
      p.weapon = cls.weapon || p.weapon;
      p.abilityCdUntil = 0;
      p.stunUntil = 0;
      players.set(cfg.id, p);
      spawnAssignment.set(cfg.id, { team: team, x: spawn.x, y: spawn.y, classId: classId });
    });
    projectiles = [];
    npcs = [];
    inputs = new Map();
    killfeed = [];
    matchStartTime = performance.now() / 1000;
    matchOver = false;
    winnerName = null;
    flags = GameMap.FLAGS.map(function (f) {
      return {
        id: f.id, name: f.name, x: f.x, y: f.y, radius: f.radius, team: f.team,
        progress: 0, capturingTeam: -1,
        structureHp: (f.id === "camp_hq" || f.id === "castle_hq") ? HQ_MAX_HP : null,
        structureMax: (f.id === "camp_hq" || f.id === "castle_hq") ? HQ_MAX_HP : null,
      };
    });
    towerCooldown = {};
    GameMap.TOWERS.forEach(function (t) { towerCooldown[t.id] = 0; });
    zoneSpawnTimer = { nymphs: 0, village: 0, outpost: 0 };
    npcIdCounter = 1;
  }

  function setInput(id, input) { inputs.set(id, input); }

  function markDisconnected(peerId) {
    var p = players.get(peerId);
    if (!p) return;
    p.alive = false;
    p.hp = 0;
    p.respawnAt = Infinity;
    inputs.delete(peerId);
  }

  function midFlags() {
    return flags.filter(function (f) {
      return f.id === "nymphs" || f.id === "village" || f.id === "outpost";
    });
  }

  function damageUnit(unit, dmg, now) {
    if (!unit || !unit.alive) return false;
    unit.hp = Math.max(0, unit.hp - dmg);
    unit.lastHitFlashAt = now;
    tickEvents.push({ kind: "hit", x: unit.x, y: unit.y });
    if (unit.hp <= 0) {
      unit.alive = false;
      if (unit.respawnAt !== undefined) unit.respawnAt = now + (typeof RESPAWN_SECONDS !== "undefined" ? RESPAWN_SECONDS : 4);
      tickEvents.push({ kind: "death", x: unit.x, y: unit.y });
      return true;
    }
    return false;
  }

  function useAbility(player, now) {
    var cls = (typeof getClass === "function") ? getClass(player.classId) : null;
    if (!cls || !cls.ability) return;
    if (now < (player.abilityCdUntil || 0)) return;
    var ab = cls.ability;
    player.abilityCdUntil = now + ab.cooldown;
    tickEvents.push({ kind: "ability", classId: player.classId, abilityId: ab.id, x: player.x, y: player.y, angle: player.angle });

    if (ab.id === "bash") {
      var targets = Array.from(players.values()).concat(npcs);
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t.alive || t.team === player.team || t.id === player.id) continue;
        var d = Math.hypot(t.x - player.x, t.y - player.y);
        if (d > ab.range) continue;
        var ang = Math.atan2(t.y - player.y, t.x - player.x);
        var diff = Math.abs(Math.atan2(Math.sin(ang - player.angle), Math.cos(ang - player.angle)));
        if (diff > 1.1) continue;
        damageUnit(t, ab.damage, now);
        t.stunUntil = now + ab.stun;
      }
    } else if (ab.id === "volley") {
      var shots = ab.shots || 5;
      var spread = ab.spread || 0.35;
      for (var s = 0; s < shots; s++) {
        var a = player.angle - spread / 2 + (spread * s) / Math.max(1, shots - 1);
        var proj = createProjectile(player, "bow");
        proj.angle = a;
        proj.vx = Math.cos(a) * (proj.speed || 420);
        proj.vy = Math.sin(a) * (proj.speed || 420);
        projectiles.push(proj);
      }
    } else if (ab.id === "nova") {
      var targets2 = Array.from(players.values()).concat(npcs);
      for (var j = 0; j < targets2.length; j++) {
        var u = targets2[j];
        if (!u.alive || u.team === player.team || u.id === player.id) continue;
        if (Math.hypot(u.x - player.x, u.y - player.y) <= ab.radius) {
          damageUnit(u, ab.damage, now);
        }
      }
      flags.forEach(function (f) {
        if (f.structureHp == null) return;
        if ((player.team === 0 && f.id !== "castle_hq") || (player.team === 1 && f.id !== "camp_hq")) return;
        if (Math.hypot(f.x - player.x, f.y - player.y) <= ab.radius) {
          f.structureHp = Math.max(0, f.structureHp - Math.floor(ab.damage * 0.4));
          tickEvents.push({ kind: "structure_hit", flagId: f.id, hp: f.structureHp });
          if (f.structureHp <= 0) {
            matchOver = true;
            winnerName = player.team === 0 ? "Camp" : "Castle";
          }
        }
      });
    } else if (ab.id === "restore") {
      player.hp = Math.min(player.maxHp || MAX_HP, player.hp + (ab.heal || 40));
      var dash = ab.dash || 80;
      var nx = player.x + Math.cos(player.angle) * dash;
      var ny = player.y + Math.sin(player.angle) * dash;
      var resolved = moveEntity(player.x, player.y, nx - player.x, ny - player.y, typeof PLAYER_RADIUS !== "undefined" ? PLAYER_RADIUS : 14);
      player.x = resolved.x;
      player.y = resolved.y;
      tickEvents.push({ kind: "heal", x: player.x, y: player.y });
    }
  }

  function updateFlags(dt) {
    for (var i = 0; i < flags.length; i++) {
      var f = flags[i];
      if (f.id === "camp_hq" || f.id === "castle_hq") continue;
      var present = { 0: 0, 1: 0 };
      players.forEach(function (p) {
        if (!p.alive) return;
        if (Math.hypot(p.x - f.x, p.y - f.y) <= f.radius) present[p.team]++;
      });
      var only0 = present[0] > 0 && present[1] === 0;
      var only1 = present[1] > 0 && present[0] === 0;
      if (only0 || only1) {
        var capturer = only0 ? 0 : 1;
        if (f.team === capturer) {
          f.progress = 0;
          f.capturingTeam = -1;
        } else {
          f.capturingTeam = capturer;
          f.progress += dt / CAPTURE_TIME;
          if (f.progress >= 1) {
            var oldTeam = f.team;
            f.team = capturer;
            f.progress = 0;
            f.capturingTeam = -1;
            npcs.forEach(function (n) {
              if (n.zoneId === f.id && n.team === oldTeam) { n.alive = false; n.hp = 0; }
            });
            zoneSpawnTimer[f.id] = 0;
            tickEvents.push({ kind: "capture", flagId: f.id, team: capturer, x: f.x, y: f.y });
          }
        }
      } else {
        f.progress = Math.max(0, f.progress - dt / (CAPTURE_TIME * 0.8));
        if (f.progress <= 0) f.capturingTeam = -1;
      }
    }
  }

  function updateTowers(now) {
    GameMap.TOWERS.forEach(function (tw) {
      if (now < towerCooldown[tw.id]) return;
      var best = null;
      var bestDist = tw.range;
      function consider(unit) {
        if (!unit.alive || unit.team === tw.team) return;
        var d = Math.hypot(unit.x - tw.x, unit.y - tw.y);
        if (d < bestDist) { bestDist = d; best = unit; }
      }
      players.forEach(consider);
      npcs.forEach(consider);
      if (best) {
        towerCooldown[tw.id] = now + tw.cooldown;
        damageUnit(best, tw.damage, now);
        tickEvents.push({ kind: "tower_shot", x: tw.x, y: tw.y, tx: best.x, ty: best.y });
        if (!best.alive && best.name) {
          killfeed.unshift({ killerName: "Tower", targetName: best.name, weaponId: "bow", at: now });
          killfeed = killfeed.slice(0, 5);
        }
      }
    });
  }

  function countZoneNpcs(zoneId, team) {
    var n = 0;
    for (var i = 0; i < npcs.length; i++) {
      if (npcs[i].alive && npcs[i].zoneId === zoneId && npcs[i].team === team) n++;
    }
    return n;
  }

  function spawnFromZones(dt) {
    midFlags().forEach(function (f) {
      if (f.team !== 0 && f.team !== 1) return;
      var flavor = ZONE_FLAVOR[f.id];
      if (!flavor) return;
      zoneSpawnTimer[f.id] = (zoneSpawnTimer[f.id] || 0) + dt;
      var owned = countZoneNpcs(f.id, f.team);
      if (owned >= NPC_PER_ZONE) return;
      if (zoneSpawnTimer[f.id] < SPAWN_INTERVAL) return;
      zoneSpawnTimer[f.id] = 0;
      var tier = owned;
      var def = flavor.units[tier] || flavor.units[0];
      var angle = f.team === 0 ? 0 : Math.PI;
      npcs.push({
        id: "npc-" + (npcIdCounter++),
        name: def.name, team: f.team, zoneId: f.id, tier: tier,
        isRam: !!def.isRam,
        x: f.x + (Math.random() - 0.5) * 40,
        y: f.y + (Math.random() - 0.5) * 40,
        angle: angle, hp: def.hp, maxHp: def.hp, alive: true,
        speed: def.speed, damage: def.damage, range: def.range,
        attackCooldown: def.isRam ? 1.25 : 0.8, lastAttackAt: 0,
        color: def.color, colorIndex: f.team === 0 ? 0 : 1, stuckTimer: 0,
      });
      tickEvents.push({ kind: "spawn", x: f.x, y: f.y, team: f.team, isRam: !!def.isRam });
    });
  }

  function updateNpcs(dt, now) {
    for (var i = 0; i < npcs.length; i++) {
      var n = npcs[i];
      if (!n.alive) continue;
      if (n.stunUntil && now < n.stunUntil) continue;

      var target = null;
      var bestD = n.isRam ? 1000 : 480;

      if (n.isRam) {
        var enemyHq = null;
        for (var fi = 0; fi < flags.length; fi++) {
          var ff = flags[fi];
          if (n.team === 0 && ff.id === "castle_hq") enemyHq = ff;
          if (n.team === 1 && ff.id === "camp_hq") enemyHq = ff;
        }
        if (enemyHq) {
          target = { x: enemyHq.x, y: enemyHq.y, alive: true, team: 1 - n.team, isStructure: true, flag: enemyHq, hp: enemyHq.structureHp };
          bestD = Math.hypot(enemyHq.x - n.x, enemyHq.y - n.y);
        }
      }

      if (!n.isRam || bestD > 100) {
        players.forEach(function (p) {
          if (!p.alive || p.team === n.team) return;
          var d = Math.hypot(p.x - n.x, p.y - n.y);
          if (d < bestD) { bestD = d; target = p; }
        });
        for (var j = 0; j < npcs.length; j++) {
          var o = npcs[j];
          if (!o.alive || o.team === n.team || o.id === n.id) continue;
          var d2 = Math.hypot(o.x - n.x, o.y - n.y);
          if (d2 < bestD) { bestD = d2; target = o; }
        }
      }

      if (!target && !n.isRam) {
        var hq = null;
        for (var hi = 0; hi < flags.length; hi++) {
          var hf = flags[hi];
          if (n.team === 0 && hf.id === "castle_hq") hq = hf;
          if (n.team === 1 && hf.id === "camp_hq") hq = hf;
        }
        if (hq) {
          target = { x: hq.x, y: hq.y, alive: true, team: 1 - n.team, isStructure: true, flag: hq };
          bestD = Math.hypot(hq.x - n.x, hq.y - n.y);
        }
      }
      if (!target) continue;

      n.angle = Math.atan2(target.y - n.y, target.x - n.x);
      var rad = n.isRam ? 16 : 12;

      if (bestD > n.range) {
        var stepX = Math.cos(n.angle) * n.speed * dt;
        var stepY = Math.sin(n.angle) * n.speed * dt;
        var prevX = n.x, prevY = n.y;
        var resolved = moveEntity(n.x, n.y, stepX, stepY, rad);
        var moved = Math.hypot(resolved.x - prevX, resolved.y - prevY);
        if (moved < 0.5) {
          n.stuckTimer = (n.stuckTimer || 0) + dt;
          var side = (i % 2 === 0) ? 1 : -1;
          var alt = moveEntity(n.x, n.y, -stepY * side * 1.2, stepX * side * 1.2, rad);
          if (Math.hypot(alt.x - prevX, alt.y - prevY) > moved) resolved = alt;
          else {
            alt = moveEntity(n.x, n.y, -stepY * -side * 1.2, stepX * -side * 1.2, rad);
            if (Math.hypot(alt.x - prevX, alt.y - prevY) > moved) resolved = alt;
          }
          if (n.stuckTimer > 1.2) {
            n.x += (Math.random() - 0.5) * 40;
            n.y += (Math.random() - 0.5) * 40;
            resolved = GameMap.resolveCircleCollision(n.x, n.y, rad);
            n.stuckTimer = 0;
          }
        } else n.stuckTimer = 0;
        n.x = resolved.x;
        n.y = resolved.y;
      } else if (now - n.lastAttackAt >= n.attackCooldown) {
        n.lastAttackAt = now;
        if (target.isStructure && target.flag) {
          var dmg = n.isRam ? RAM_STRUCTURE_DAMAGE : Math.floor(n.damage * 0.5);
          target.flag.structureHp = Math.max(0, (target.flag.structureHp || 0) - dmg);
          tickEvents.push({ kind: "hit", x: target.x, y: target.y });
          tickEvents.push({ kind: "structure_hit", flagId: target.flag.id, hp: target.flag.structureHp });
          if (target.flag.structureHp <= 0) {
            matchOver = true;
            winnerName = n.team === 0 ? "Camp" : "Castle";
            tickEvents.push({ kind: "death", x: target.x, y: target.y });
            killfeed.unshift({ killerName: n.name, targetName: target.flag.name, weaponId: "axe", at: now });
            killfeed = killfeed.slice(0, 5);
          }
        } else if (target.hp != null) {
          damageUnit(target, n.damage, now);
        }
      }
    }
    npcs = npcs.filter(function (n) { return n.alive; });
  }

  function tick(dt) {
    tickEvents = [];
    if (matchOver) return;
    var now = performance.now() / 1000;
    var speed = typeof PLAYER_SPEED !== "undefined" ? PLAYER_SPEED : 210;
    var radius = typeof PLAYER_RADIUS !== "undefined" ? PLAYER_RADIUS : 14;

    players.forEach(function (player) {
      var input = inputs.get(player.id);
      if (!input || !player.alive) return;
      if (player.stunUntil && now < player.stunUntil) return;

      var mul = player.speedMul || 1;
      var resolved = moveEntity(player.x, player.y, input.dx * speed * mul * dt, input.dy * speed * mul * dt, radius);
      player.x = resolved.x;
      player.y = resolved.y;
      player.angle = input.angle;
      if (input.weapon && WEAPONS[input.weapon]) player.weapon = input.weapon;

      if (input.ability) useAbility(player, now);

      if (input.attack) {
        var weapon = WEAPONS[player.weapon];
        if (weapon && now - player.lastAttackAt >= weapon.cooldown) {
          player.lastAttackAt = now;
          player.lastAttackAnimAt = now;
          var allTargets = Array.from(players.values()).concat(npcs);
          if (weapon.type === "melee") {
            tickEvents.push({ kind: "melee", weaponId: weapon.id, x: player.x, y: player.y, angle: player.angle });
            registerEvents(Combat.tryMeleeAttack(player, allTargets));
          } else {
            tickEvents.push({ kind: "ranged", weaponId: weapon.id, x: player.x, y: player.y, angle: player.angle });
            projectiles.push(createProjectile(player, player.weapon));
          }
        }
      }
    });

    var allTargets = Array.from(players.values()).concat(npcs);
    var projResult = Combat.updateProjectiles(projectiles, allTargets, dt);
    projectiles = projResult.survivors;
    registerEvents(projResult.events);
    Combat.processRespawns(Array.from(players.values()), spawnAssignment);

    players.forEach(function (p) {
      if (p.alive && p.maxHp && p.hp >= (typeof MAX_HP !== "undefined" ? MAX_HP : 100) - 0.5) {
        if (p.maxHp !== (typeof MAX_HP !== "undefined" ? MAX_HP : 100)) p.hp = p.maxHp;
      }
    });

    updateFlags(dt);
    updateTowers(now);
    spawnFromZones(dt);
    updateNpcs(dt, now);

    if (!matchOver && now - matchStartTime >= MATCH_DURATION) {
      matchOver = true;
      var c0 = 0, c1 = 0;
      midFlags().forEach(function (f) {
        if (f.team === 0) c0++;
        if (f.team === 1) c1++;
      });
      if (c0 > c1) winnerName = "Camp";
      else if (c1 > c0) winnerName = "Castle";
      else winnerName = "Draw";
    }
  }

  function registerEvents(events) {
    var now = performance.now() / 1000;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      tickEvents.push({ kind: "hit", x: ev.x, y: ev.y });
      if (ev.killed) {
        tickEvents.push({ kind: "death", x: ev.x, y: ev.y });
        var attacker = players.get(ev.attackerId);
        var target = players.get(ev.targetId);
        if (attacker) attacker.score += 1;
        killfeed.unshift({
          killerName: attacker ? attacker.name : "?",
          targetName: target ? target.name : String(ev.targetId || "?"),
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
      projectiles: projectiles,
      npcs: npcs.filter(function (n) { return n.alive; }),
      flags: flags,
      killfeed: killfeed,
      matchOver: matchOver,
      winnerName: winnerName,
      timeLeft: Math.max(0, MATCH_DURATION - (performance.now() / 1000 - matchStartTime)),
    };
  }

  function getSnapshotPayload() {
    var s = getState();
    var now = performance.now() / 1000;
    return {
      type: "snapshot",
      players: s.players.map(function (p) {
        return {
          id: p.id, name: p.name, colorIndex: p.colorIndex, team: p.team,
          classId: p.classId || "warrior",
          x: p.x, y: p.y, angle: p.angle, hp: p.hp, maxHp: p.maxHp || MAX_HP,
          weapon: p.weapon, alive: p.alive, score: p.score,
          abilityCdUntil: p.abilityCdUntil || 0,
          lastHitFlashAt: p.lastHitFlashAt, lastAttackAnimAt: p.lastAttackAnimAt,
        };
      }),
      projectiles: s.projectiles.map(function (p) {
        return { id: p.id, x: p.x, y: p.y, angle: p.angle, weaponId: p.weaponId };
      }),
      npcs: s.npcs.map(function (n) {
        return {
          id: n.id, name: n.name, team: n.team, zoneId: n.zoneId, tier: n.tier,
          isRam: n.isRam, x: n.x, y: n.y, angle: n.angle,
          hp: n.hp, maxHp: n.maxHp, alive: n.alive, color: n.color, colorIndex: n.colorIndex,
        };
      }),
      flags: s.flags.map(function (f) {
   
