/**
 * host-sim.js — Conquest + class abilities + ultimate charge by damage.
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

  function getDefaultSpawns() {
    if (typeof GameMap !== "undefined" && GameMap.SPAWNS && GameMap.SPAWNS.length) {
      return GameMap.SPAWNS;
    }
    return [
      { x: 200, y: 300, team: 0 },
      { x: 2800, y: 300, team: 1 },
      { x: 200, y: 700, team: 0 },
      { x: 2800, y: 700, team: 1 },
    ];
  }

  function getDefaultFlags() {
    if (typeof GameMap !== "undefined" && GameMap.FLAGS && GameMap.FLAGS.length) {
      return GameMap.FLAGS;
    }
    return [
      { id: "camp_hq", name: "Camp HQ", x: 150, y: 500, radius: 60, team: 0 },
      { id: "castle_hq", name: "Castle HQ", x: 2850, y: 500, radius: 60, team: 1 },
      { id: "nymphs", name: "Nymphs", x: 1000, y: 300, radius: 55, team: -1 },
      { id: "village", name: "Village", x: 1500, y: 500, radius: 55, team: -1 },
      { id: "outpost", name: "Outpost", x: 2000, y: 700, radius: 55, team: -1 },
    ];
  }

  function getDefaultTowers() {
    if (typeof GameMap !== "undefined" && GameMap.TOWERS && GameMap.TOWERS.length) {
      return GameMap.TOWERS;
    }
    return [
      { id: "t1", x: 400, y: 500, range: 180, damage: 12, cooldown: 1.2, team: 0 },
      { id: "t2", x: 2600, y: 500, range: 180, damage: 12, cooldown: 1.2, team: 1 },
    ];
  }

  function moveEntity(x, y, dx, dy, radius) {
    if (typeof GameMap !== "undefined") {
      if (GameMap.tryMove) return GameMap.tryMove(x, y, dx, dy, radius);
      if (GameMap.resolveCircleCollision) return GameMap.resolveCircleCollision(x + dx, y + dy, radius);
    }
    return { x: x + dx, y: y + dy };
  }

  function safeCreatePlayer(id, name, colorIndex, spawnIndex) {
    var spawns = getDefaultSpawns();
    var spawn = spawns[spawnIndex % spawns.length] || spawns[0] || { x: 300, y: 300 };
    var maxHp = typeof MAX_HP !== "undefined" ? MAX_HP : 100;
    return {
      id: id, name: name || "Player",
      colorIndex: (colorIndex || 0) % 4,
      x: spawn.x, y: spawn.y,
      angle: 0,
      hp: maxHp,
      maxHp: maxHp,
      weapon: "sword",
      alive: true,
      score: 0,
      lastAttackAt: -999,
      respawnAt: 0,
      lastHitFlashAt: -999,
      lastAttackAnimAt: -999,
      team: spawn.team != null ? spawn.team : 0,
      classId: "warrior",
      speedMul: 1,
      abilityCdUntil: 0,
      stunUntil: 0,
      ultimateCharge: 0,
      shield: 0,
      appearance: null,
    };
  }

  function getClassSafe(classId) {
    if (typeof getClass === "function") {
      try { return getClass(classId); } catch (e) {}
    }
    if (typeof CLASSES !== "undefined" && CLASSES[classId]) return CLASSES[classId];
    return {
      maxHp: 100, speedMul: 1, weapon: "sword",
      ultimate: { id: "whirlwind", name: "Whirlwind", cost: 100, damage: 45, radius: 70, shield: 25 }
    };
  }

  function init(playerConfigs) {
    players = new Map();
    spawnAssignment = new Map();
    projectiles = [];
    npcs = [];
    inputs = new Map();
    killfeed = [];
    matchStartTime = performance.now() / 1000;
    matchOver = false;
    winnerName = null;
    tickEvents = [];
    npcIdCounter = 1;

    var spawns = getDefaultSpawns();
    var flagDefs = getDefaultFlags();
    var towerDefs = getDefaultTowers();

    flags = flagDefs.map(function (f) {
      return {
        id: f.id, name: f.name, x: f.x, y: f.y, radius: f.radius, team: f.team != null ? f.team : -1,
        progress: 0, capturingTeam: -1,
        structureHp: (f.id === "camp_hq" || f.id === "castle_hq") ? HQ_MAX_HP : null,
        structureMax: (f.id === "camp_hq" || f.id === "castle_hq") ? HQ_MAX_HP : null,
      };
    });

    towerCooldown = {};
    towerDefs.forEach(function (t) { towerCooldown[t.id] = 0; });
    zoneSpawnTimer = { nymphs: 0, village: 0, outpost: 0 };

    var configs = playerConfigs && playerConfigs.length ? playerConfigs : [];
    if (!configs.length) {
      configs = [{ id: "solo-player", name: "Solo", colorIndex: 0, team: 0, classId: "warrior" }];
    }

    configs.forEach(function (cfg, i) {
      var team = cfg.team != null ? cfg.team : (i % 2);
      var classId = cfg.classId || "warrior";
      var cls = getClassSafe(classId);
      var teamSpawns = spawns.filter(function (s) { return s.team === team; });
      var spawn = teamSpawns[i % teamSpawns.length] || spawns[i % spawns.length] || spawns[0] || { x: 300, y: 300 };

      var p;
      if (typeof createPlayer === "function") {
        try {
          p = createPlayer(cfg.id, cfg.name, cfg.colorIndex != null ? cfg.colorIndex : i, 0);
          p.x = spawn.x; p.y = spawn.y; p.team = team; p.classId = classId;
          p.maxHp = cls.maxHp || 100; p.hp = p.maxHp;
          p.speedMul = cls.speedMul || 1;
          p.weapon = cls.weapon || p.weapon;
          p.abilityCdUntil = 0; p.stunUntil = 0;
          p.ultimateCharge = 0;
          p.shield = 0;
          p.appearance = cfg.appearance || null;
        } catch (e) {
          p = safeCreatePlayer(cfg.id, cfg.name, cfg.colorIndex != null ? cfg.colorIndex : i, i);
          p.team = team; p.classId = classId;
          p.maxHp = cls.maxHp || 100; p.hp = p.maxHp;
          p.speedMul = cls.speedMul || 1;
          p.weapon = cls.weapon || p.weapon;
          p.appearance = cfg.appearance || null;
        }
      } else {
        p = safeCreatePlayer(cfg.id, cfg.name, cfg.colorIndex != null ? cfg.colorIndex : i, i);
        p.team = team; p.classId = classId;
        p.maxHp = cls.maxHp || 100; p.hp = p.maxHp;
        p.speedMul = cls.speedMul || 1;
        p.weapon = cls.weapon || p.weapon;
        p.appearance = cfg.appearance || null;
      }

      players.set(cfg.id, p);
      spawnAssignment.set(cfg.id, { team: team, x: spawn.x, y: spawn.y, classId: classId });
    });

    if (players.size === 0) {
      var fallback = safeCreatePlayer("solo-fallback", "Player", 0, 0);
      players.set(fallback.id, fallback);
      spawnAssignment.set(fallback.id, { team: 0, x: 300, y: 300, classId: "warrior" });
    }
  }

  function setInput(id, input) { inputs.set(id, input); }

  function markDisconnected(peerId) {
    var p = players.get(peerId);
    if (!p) return;
    p.alive = false; p.hp = 0; p.respawnAt = Infinity;
    inputs.delete(peerId);
  }

  function midFlags() {
    return flags.filter(function (f) {
      return f.id === "nymphs" || f.id === "village" || f.id === "outpost";
    });
  }

  function damageUnit(unit, dmg, now, attacker) {
    if (!unit || !unit.alive) return { killed: false, actualDamage: 0 };

    var actualDmg = dmg;
    if (unit.shield > 0) {
      var absorbed = Math.min(unit.shield, actualDmg);
      unit.shield -= absorbed;
      actualDmg -= absorbed;
    }

    var cls = getClassSafe(unit.classId);
    if (cls && cls.passive && cls.passive.damageReduction) {
      actualDmg = Math.floor(actualDmg * (1 - cls.passive.damageReduction));
    }

    unit.hp = Math.max(0, unit.hp - actualDmg);
    unit.lastHitFlashAt = now;
    tickEvents.push({ kind: "hit", x: unit.x, y: unit.y });

    if (typeof ULTIMATE_CHARGE !== "undefined" && ULTIMATE_CHARGE.perDamageTaken) {
      unit.ultimateCharge = Math.min(ULTIMATE_CHARGE.maxCharge || 100,
        (unit.ultimateCharge || 0) + actualDmg * ULTIMATE_CHARGE.perDamageTaken);
    }

    if (attacker && attacker.id !== unit.id && typeof ULTIMATE_CHARGE !== "undefined" && ULTIMATE_CHARGE.perDamageDealt) {
      var chargeMul = 1;
      var attackerCls = getClassSafe(attacker.classId);
      if (attackerCls && attackerCls.passive && attackerCls.passive.chargeBonus) {
        chargeMul += attackerCls.passive.chargeBonus;
      }
      attacker.ultimateCharge = Math.min(ULTIMATE_CHARGE.maxCharge || 100,
        (attacker.ultimateCharge || 0) + actualDmg * ULTIMATE_CHARGE.perDamageDealt * chargeMul);
    }

    if (unit.hp <= 0) {
      unit.alive = false;
      if (unit.respawnAt !== undefined) unit.respawnAt = now + (typeof RESPAWN_SECONDS !== "undefined" ? RESPAWN_SECONDS : 4);
      tickEvents.push({ kind: "death", x: unit.x, y: unit.y });
      return { killed: true, actualDamage: actualDmg };
    }
    return { killed: false, actualDamage: actualDmg };
  }

  function useUltimate(player, now) {
    var cls = getClassSafe(player.classId);
    if (!cls || !cls.ultimate) return;
    var ult = cls.ultimate;
    if ((player.ultimateCharge || 0) < (ult.cost || 100)) return;

    player.ultimateCharge = 0;
    tickEvents.push({ kind: "ultimate", classId: player.classId, ultimateId: ult.id, x: player.x, y: player.y, angle: player.angle });

    if (ult.id === "whirlwind") {
      var targets = Array.from(players.values()).concat(npcs);
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t.alive || t.team === player.team || t.id === player.id) continue;
        if (Math.hypot(t.x - player.x, t.y - player.y) <= (ult.radius || 70)) {
          damageUnit(t, ult.damage || 45, now, player);
        }
      }
      player.shield = (player.shield || 0) + (ult.shield || 25);
    } else if (ult.id === "arrow_storm") {
      var shots = ult.shots || 12;
      var spread = ult.spread || 1.2;
      for (var s = 0; s < shots; s++) {
        var a = player.angle - spread / 2 + (spread * s) / Math.max(1, shots - 1);
        var proj = createProjectile(player, "bow");
        if (proj) {
          proj.angle = a;
          proj.vx = Math.cos(a) * (ult.speed || 520);
          proj.vy = Math.sin(a) * (ult.speed || 520);
          proj.damage = ult.damage || 18;
          proj.radius = ult.projectileRadius || 4;
          projectiles.push(proj);
        }
      }
    } else if (ult.id === "arcane_blast") {
      var targets2 = Array.from(players.values()).concat(npcs);
      for (var j = 0; j < targets2.length; j++) {
        var u = targets2[j];
        if (!u.alive || u.team === player.team || u.id === player.id) continue;
        var dist = Math.hypot(u.x - player.x, u.y - player.y);
        if (dist <= (ult.radius || 100)) {
          var dmgMult = 1 - (dist / (ult.radius || 100)) * 0.5;
          var dmg = Math.floor((ult.damage || 55) * dmgMult);
          damageUnit(u, dmg, now, player);
          if (ult.pushForce && dist > 0) {
            var pushX = (u.x - player.x) / dist * ult.pushForce;
            var pushY = (u.y - player.y) / dist * ult.pushForce;
            var pushed = moveEntity(u.x, u.y, pushX, pushY, typeof PLAYER_RADIUS !== "undefined" ? PLAYER_RADIUS : 14);
            u.x = pushed.x; u.y = pushed.y;
          }
        }
      }
      flags.forEach(function (f) {
        if (f.structureHp == null) return;
        if ((player.team === 0 && f.id !== "castle_hq") || (player.team === 1 && f.id !== "camp_hq")) return;
        if (Math.hypot(f.x - player.x, f.y - player.y) <= (ult.radius || 100)) {
          f.structureHp = Math.max(0, f.structureHp - Math.floor((ult.damage || 55) * 0.3));
          tickEvents.push({ kind: "structure_hit", flagId: f.id, hp: f.structureHp });
          if (f.structureHp <= 0) { matchOver = true; winnerName = player.team === 0 ? "Camp" : "Castle"; }
        }
      });
    } else if (ult.id === "natures_blessing") {
      var allies = Array.from(players.values());
      for (var k = 0; k < allies.length; k++) {
        var ally = allies[k];
        if (!ally.alive || ally.team !== player.team) continue;
        if (Math.hypot(ally.x - player.x, ally.y - player.y) <= (ult.radius || 90)) {
          var healAmt = ult.heal || 35;
          var beforeHp = ally.hp;
          ally.hp = Math.min(ally.maxHp || 100, ally.hp + healAmt);
          ally.shield = (ally.shield || 0) + (ult.shield || 15);
          tickEvents.push({ kind: "heal", x: ally.x, y: ally.y });
          var healed = ally.hp - beforeHp;
          if (healed > 0 && typeof ULTIMATE_CHARGE !== "undefined" && ULTIMATE_CHARGE.perHealGiven) {
            player.ultimateCharge = Math.min(ULTIMATE_CHARGE.maxCharge || 100,
              (player.ultimateCharge || 0) + healed * ULTIMATE_CHARGE.perHealGiven);
          }
        }
      }
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
        if (f.team === capturer) { f.progress = 0; f.capturingTeam = -1; }
        else {
          f.capturingTeam = capturer;
          f.progress += dt / CAPTURE_TIME;
          if (f.progress >= 1) {
            var oldTeam = f.team;
            f.team = capturer; f.progress = 0; f.capturingTeam = -1;
            npcs.forEach(function (n) { if (n.zoneId === f.id && n.team === oldTeam) { n.alive = false; n.hp = 0; } });
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
    var towers = getDefaultTowers();
    towers.forEach(function (tw) {
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
        damageUnit(best, tw.damage, now, null);
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
