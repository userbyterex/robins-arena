/**
 * host-sim.js — Conquest + class ultimates + bot AI + CAT NPCs by class.
 * Paste-safe. With integration logging.
 */
var HostSim = (function () {
  console.log("[HostSim] loading…");

  var TICK_RATE = 20;
  var MATCH_DURATION = 480;
  var CAPTURE_TIME = 3.0;
  var NPC_PER_ZONE = 3;
  var SPAWN_INTERVAL = 5.0;
  var HQ_MAX_HP = 280;
  var RAM_STRUCTURE_DAMAGE = 22;
  var RESPAWN_SECONDS = 4;
  var PLAYER_RADIUS = 14;
  var BASE_SPEED = 210;

  var ULT = {
    maxCharge: 100,
    perDamageDealt: 0.35,
    perDamageTaken: 0.18,
    perHealGiven: 0.25
  };

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
  var botThinkTimer = {};

  // Cat units by class (spawned from captured zones)
  var CAT_UNITS = {
    warrior: {
      name: "Cat Warrior",
      classId: "warrior",
      hp: 55,
      speed: 120,
      damage: 16,
      range: 36,
      attackCooldown: 0.85,
      color: "#c0392b",
      isRam: false
    },
    ranger: {
      name: "Cat Archer",
      classId: "ranger",
      hp: 42,
      speed: 145,
      damage: 14,
      range: 160,
      attackCooldown: 1.0,
      color: "#27ae60",
      isRam: false,
      isRanged: true
    },
    mage: {
      name: "Cat Mage",
      classId: "mage",
      hp: 36,
      speed: 125,
      damage: 22,
      range: 120,
      attackCooldown: 1.15,
      color: "#8e44ad",
      isRam: false,
      isRanged: true
    },
    monk: {
      name: "Cat Monk",
      classId: "monk",
      hp: 48,
      speed: 150,
      damage: 12,
      range: 34,
      attackCooldown: 0.75,
      color: "#f39c12",
      isRam: false
    },
    ram: {
      name: "Siege Cat",
      classId: "warrior",
      hp: 200,
      speed: 58,
      damage: 10,
      range: 28,
      attackCooldown: 1.25,
      color: "#5d4037",
      isRam: true
    }
  };

  // Zone → which cat classes spawn (tier 0,1,2)
  var ZONE_FLAVOR = {
    nymphs: {
      name: "Nymphs Grove",
      units: [CAT_UNITS.monk, CAT_UNITS.ranger, CAT_UNITS.ram]
    },
    village: {
      name: "Village",
      units: [CAT_UNITS.warrior, CAT_UNITS.mage, CAT_UNITS.ram]
    },
    outpost: {
      name: "Outpost",
      units: [CAT_UNITS.ranger, CAT_UNITS.warrior, CAT_UNITS.ram]
    }
  };

  function getDefaultSpawns() {
    if (typeof GameMap !== "undefined" && GameMap.SPAWNS && GameMap.SPAWNS.length) {
      return GameMap.SPAWNS;
    }
    return [
      { x: 120, y: 280, team: 0 },
      { x: 1480, y: 280, team: 1 },
      { x: 120, y: 620, team: 0 },
      { x: 1480, y: 620, team: 1 }
    ];
  }

  function getDefaultFlags() {
    if (typeof GameMap !== "undefined" && GameMap.FLAGS && GameMap.FLAGS.length) {
      return GameMap.FLAGS;
    }
    return [
      { id: "camp_hq", name: "Camp HQ", x: 100, y: 450, radius: 48, team: 0 },
      { id: "castle_hq", name: "Castle HQ", x: 1500, y: 450, radius: 48, team: 1 },
      { id: "nymphs", name: "Nymphs", x: 520, y: 280, radius: 44, team: -1 },
      { id: "village", name: "Village", x: 800, y: 450, radius: 48, team: -1 },
      { id: "outpost", name: "Outpost", x: 1080, y: 620, radius: 44, team: -1 }
    ];
  }

  function getDefaultTowers() {
    if (typeof GameMap !== "undefined" && GameMap.TOWERS && GameMap.TOWERS.length) {
      return GameMap.TOWERS;
    }
    return [
      { id: "t1", x: 260, y: 450, range: 150, damage: 12, cooldown: 1.2, team: 0 },
      { id: "t2", x: 1340, y: 450, range: 150, damage: 12, cooldown: 1.2, team: 1 }
    ];
  }

  function moveEntity(x, y, dx, dy, radius) {
    if (typeof GameMap !== "undefined") {
      if (GameMap.tryMove) return GameMap.tryMove(x, y, dx, dy, radius);
      if (GameMap.resolveCircleCollision) return GameMap.resolveCircleCollision(x + dx, y + dy, radius);
    }
    return { x: x + dx, y: y + dy };
  }

  function getClassSafe(classId) {
    if (typeof getClass === "function") {
      try { return getClass(classId); } catch (e) {}
    }
    if (typeof CLASSES !== "undefined" && CLASSES[classId]) return CLASSES[classId];
    return {
      maxHp: 100, speedMul: 1, weapon: "sword",
      ability: { id: "whirlwind", name: "Whirlwind", damage: 32, range: 78 }
    };
  }

  function getUltimate(cls) {
    if (!cls) return null;
    if (cls.ultimate) return cls.ultimate;
    var a = cls.ability;
    if (!a) return null;

    var id = a.id;
    if (typeof resolveAbilityId === "function") id = resolveAbilityId(id);

    // New ids + legacy aliases
    if (id === "whirlwind" || id === "bash") {
      return {
        id: "whirlwind",
        name: a.name || "Whirlwind",
        cost: 100,
        damage: a.damage || 32,
        radius: a.range || a.radius || 78,
        shield: 20,
        stun: a.stun || 0.8
      };
    }
    if (id === "arrow_storm" || id === "volley") {
      return {
        id: "arrow_storm",
        name: a.name || "Arrow Storm",
        cost: 100,
        shots: a.shots || 7,
        spread: a.spread || 0.42,
        damage: a.damage || 18,
        speed: 520
      };
    }
    if (id === "arcane_blast" || id === "nova") {
      return {
        id: "arcane_blast",
        name: a.name || "Arcane Blast",
        cost: 100,
        radius: a.radius || 120,
        damage: a.damage || 42,
        pushForce: 40
      };
    }
    if (id === "natures_blessing" || id === "restore") {
      return {
        id: "natures_blessing",
        name: a.name || "Nature's Blessing",
        cost: 100,
        heal: a.heal || 50,
        radius: a.radius || 100,
        shield: a.shield || 25
      };
    }
    console.warn("[HostSim] unknown ability id:", a.id);
    return null;
  }

  function safeCreatePlayer(id, name, colorIndex, spawnIndex) {
    var spawns = getDefaultSpawns();
    var spawn = spawns[spawnIndex % spawns.length] || spawns[0] || { x: 300, y: 300 };
    return {
      id: id,
      name: name || "Player",
      colorIndex: (colorIndex || 0) % 4,
      x: spawn.x,
      y: spawn.y,
      angle: 0,
      hp: 100,
      maxHp: 100,
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
      appearance: null
    };
  }

  function init(playerConfigs) {
    console.log("[HostSim] init", (playerConfigs && playerConfigs.length) || 0, "configs");
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
    botThinkTimer = {};

    var spawns = getDefaultSpawns();
    var flagDefs = getDefaultFlags();
    var towerDefs = getDefaultTowers();

    flags = flagDefs.map(function (f) {
      return {
        id: f.id,
        name: f.name,
        x: f.x,
        y: f.y,
        radius: f.radius,
        team: f.team != null ? f.team : -1,
        progress: 0,
        capturingTeam: -1,
        structureHp: (f.id === "camp_hq" || f.id === "castle_hq") ? HQ_MAX_HP : null,
        structureMax: (f.id === "camp_hq" || f.id === "castle_hq") ? HQ_MAX_HP : null
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
      var spawn = teamSpawns[i % Math.max(1, teamSpawns.length)] || spawns[i % spawns.length] || spawns[0];

      var p = safeCreatePlayer(cfg.id, cfg.name, cfg.colorIndex != null ? cfg.colorIndex : i, i);
      p.x = spawn.x;
      p.y = spawn.y;
      p.team = team;
      p.classId = classId;
      p.maxHp = cls.maxHp || 100;
      p.hp = p.maxHp;
      p.speedMul = cls.speedMul || 1;
      p.weapon = cls.weapon || p.weapon;
      p.appearance = cfg.appearance || null;
      p.ultimateCharge = 0;
      p.shield = 0;

      players.set(cfg.id, p);
      spawnAssignment.set(cfg.id, { team: team, x: spawn.x, y: spawn.y, classId: classId });
      console.log("[HostSim] player", cfg.id, classId, "team", team, "at", Math.round(spawn.x), Math.round(spawn.y));
    });

    console.log("[HostSim] init done — map flags", flags.length, "players", players.size);
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

  function damageUnit(unit, dmg, now, attacker) {
    if (!unit || !unit.alive) return { killed: false, actualDamage: 0 };

    var actualDmg = dmg;
    if (unit.shield > 0) {
      var absorbed = Math.min(unit.shield, actualDmg);
      unit.shield -= absorbed;
      actualDmg -= absorbed;
    }

    unit.hp = Math.max(0, unit.hp - actualDmg);
    unit.lastHitFlashAt = now;
    tickEvents.push({ kind: "hit", x: unit.x, y: unit.y });

    unit.ultimateCharge = Math.min(ULT.maxCharge, (unit.ultimateCharge || 0) + actualDmg * ULT.perDamageTaken);
    if (attacker && attacker.id !== unit.id) {
      attacker.ultimateCharge = Math.min(ULT.maxCharge, (attacker.ultimateCharge || 0) + actualDmg * ULT.perDamageDealt);
    }

    if (unit.hp <= 0) {
      unit.alive = false;
      if (unit.respawnAt !== undefined) unit.respawnAt = now + RESPAWN_SECONDS;
      tickEvents.push({ kind: "death", x: unit.x, y: unit.y });

      if (attacker && attacker.score != null) {
        attacker.score = (attacker.score || 0) + 1;
        killfeed.unshift({
          killerName: attacker.name || "Unknown",
          targetName: unit.name || "Enemy",
          weaponId: attacker.weapon || "sword",
          at: now
        });
        killfeed = killfeed.slice(0, 6);
      }
      return { killed: true, actualDamage: actualDmg };
    }
    return { killed: false, actualDamage: actualDmg };
  }

  function useUltimate(player, now) {
    var cls = getClassSafe(player.classId);
    var ult = getUltimate(cls);
    if (!ult) {
      console.warn("[HostSim] no ultimate for", player.classId);
      return;
    }
    if ((player.ultimateCharge || 0) < (ult.cost || 100)) return;

    player.ultimateCharge = 0;
    console.log("[HostSim] ULT", player.name, ult.id);
    tickEvents.push({
      kind: "ultimate",
      classId: player.classId,
      ultimateId: ult.id,
      x: player.x,
      y: player.y,
      angle: player.angle
    });

    if (ult.id === "whirlwind") {
      var targets = Array.from(players.values()).concat(npcs);
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t.alive || t.team === player.team || t.id === player.id) continue;
        if (Math.hypot(t.x - player.x, t.y - player.y) <= (ult.radius || 70)) {
          damageUnit(t, ult.damage || 45, now, player);
          if (ult.stun && t.stunUntil !== undefined) {
            t.stunUntil = now + ult.stun;
          }
        }
      }
      player.shield = (player.shield || 0) + (ult.shield || 20);
    } else if (ult.id === "arrow_storm") {
      var shots = ult.shots || 7;
      var spread = ult.spread || 0.42;
      for (var s = 0; s < shots; s++) {
        var a = player.angle - spread / 2 + (spread * s) / Math.max(1, shots - 1);
        if (typeof createProjectile === "function") {
          var proj = createProjectile(player, "bow");
          if (proj) {
            proj.angle = a;
            proj.vx = Math.cos(a) * (ult.speed || 520);
            proj.vy = Math.sin(a) * (ult.speed || 520);
            proj.damage = ult.damage || 18;
            projectiles.push(proj);
          }
        } else {
          // Fallback synthetic projectile
          projectiles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(a) * (ult.speed || 520),
            vy: Math.sin(a) * (ult.speed || 520),
            damage: ult.damage || 18,
            ttl: 1.4,
            radius: 5,
            ownerId: player.id,
            ownerTeam: player.team,
            weaponId: "bow"
          });
        }
      }
    } else if (ult.id === "arcane_blast") {
      var targets2 = Array.from(players.values()).concat(npcs);
      for (var j = 0; j < targets2.length; j++) {
        var u = targets2[j];
        if (!u.alive || u.team === player.team || u.id === player.id) continue;
        var dist = Math.hypot(u.x - player.x, u.y - player.y);
        if (dist <= (ult.radius || 100)) {
          var dmgMult = 1 - (dist / (ult.radius || 100)) * 0.4;
          damageUnit(u, Math.floor((ult.damage || 40) * dmgMult), now, player);
          if (ult.pushForce && dist > 0) {
            var pushX = (u.x - player.x) / dist * ult.pushForce;
            var pushY = (u.y - player.y) / dist * ult.pushForce;
            var pushed = moveEntity(u.x, u.y, pushX, pushY, PLAYER_RADIUS);
            u.x = pushed.x;
            u.y = pushed.y;
          }
        }
      }
    } else if (ult.id === "natures_blessing") {
      var allies = Array.from(players.values());
      for (var k = 0; k < allies.length; k++) {
        var ally = allies[k];
        if (!ally.alive || ally.team !== player.team) continue;
        if (Math.hypot(ally.x - player.x, ally.y - player.y) <= (ult.radius || 90)) {
          var before = ally.hp;
          ally.hp = Math.min(ally.maxHp, ally.hp + (ult.heal || 40));
          ally.shield = (ally.shield || 0) + (ult.shield || 12);
          tickEvents.push({ kind: "heal", x: ally.x, y: ally.y });
          var healed = ally.hp - before;
          if (healed > 0) {
            player.ultimateCharge = Math.min(ULT.maxCharge, (player.ultimateCharge || 0) + healed * ULT.perHealGiven);
          }
        }
      }
    }
  }

  function updateBots(dt, now) {
    players.forEach(function (p) {
      if (!p.id || p.id.indexOf("bot-") !== 0) return;
      if (!p.alive) return;
      if (p.stunUntil && now < p.stunUntil) return;

      botThinkTimer[p.id] = (botThinkTimer[p.id] || 0) - dt;
      if (botThinkTimer[p.id] > 0) return;
      botThinkTimer[p.id] = 0.25 + Math.random() * 0.2;

      var bestTarget = null;
      var bestDist = 900;
      players.forEach(function (other) {
        if (!other.alive || other.team === p.team || other.id === p.id) return;
        var d = Math.hypot(other.x - p.x, other.y - p.y);
        if (d < bestDist) { bestDist = d; bestTarget = other; }
      });
      npcs.forEach(function (n) {
        if (!n.alive || n.team === p.team) return;
        var d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < bestDist) { bestDist = d; bestTarget = n; }
      });

      var captureTarget = null;
      if (!bestTarget || bestDist > 280) {
        midFlags().forEach(function (f) {
          if (f.team === p.team) return;
          var d = Math.hypot(f.x - p.x, f.y - p.y);
          if (!captureTarget || d < Math.hypot(captureTarget.x - p.x, captureTarget.y - p.y)) {
            captureTarget = f;
          }
        });
      }

      var goalX, goalY;
      if (bestTarget && bestDist < 320) {
        goalX = bestTarget.x;
        goalY = bestTarget.y;
      } else if (captureTarget) {
        goalX = captureTarget.x;
        goalY = captureTarget.y;
      } else {
        var hq = null;
        flags.forEach(function (f) {
          if (p.team === 0 && f.id === "castle_hq") hq = f;
          if (p.team === 1 && f.id === "camp_hq") hq = f;
        });
        if (hq) { goalX = hq.x; goalY = hq.y; }
        else { goalX = p.x; goalY = p.y; }
      }

      var angle = Math.atan2(goalY - p.y, goalX - p.x);
      p.angle = angle;
      var dx = Math.cos(angle);
      var dy = Math.sin(angle);
      var speed = BASE_SPEED * (p.speedMul || 1) * dt;
      var moved = moveEntity(p.x, p.y, dx * speed, dy * speed, PLAYER_RADIUS);
      p.x = moved.x;
      p.y = moved.y;

      var attack = bestTarget && bestDist < 90;
      if ((p.ultimateCharge || 0) >= 90 && bestTarget && bestDist < 140) {
        useUltimate(p, now);
      }

      inputs.set(p.id, {
        dx: dx, dy: dy, angle: angle, attack: attack,
        weapon: p.weapon, ultimate: false
      });
    });
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
            console.log("[HostSim] captured", f.id, "by team", capturer);
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
      if (now < (towerCooldown[tw.id] || 0)) return;
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

      var 
