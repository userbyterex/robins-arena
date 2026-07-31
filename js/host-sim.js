/**
 * host-sim.js — COMPLETE (do not truncate). Cats + class ultimates + bots.
 */
var HostSim = (function () {
  console.log("[HostSim] loading…");

  var MATCH_DURATION = 480;
  var CAPTURE_TIME = 3.0;
  var NPC_PER_ZONE = 3;
  var SPAWN_INTERVAL = 5.0;
  var HQ_MAX_HP = 280;
  var RAM_DMG = 22;
  var RESPAWN = 4;
  var PR = 14;
  var BASE_SPEED = 210;
  var ULT = { max: 100, deal: 0.35, take: 0.18, heal: 0.25 };

  var players = new Map();
  var projectiles = [];
  var npcs = [];
  var inputs = new Map();
  var spawns = new Map();
  var killfeed = [];
  var matchStart = 0;
  var matchOver = false;
  var winnerName = null;
  var events = [];
  var flags = [];
  var towerCd = {};
  var zoneTimer = {};
  var npcId = 1;
  var botTimer = {};

  var CATS = {
    warrior: { name: "Cat Warrior", classId: "warrior", hp: 55, speed: 120, damage: 16, range: 36, cd: 0.85, color: "#c0392b" },
    ranger:  { name: "Cat Archer",  classId: "ranger",  hp: 42, speed: 145, damage: 14, range: 160, cd: 1.0,  color: "#27ae60", ranged: true },
    mage:    { name: "Cat Mage",    classId: "mage",    hp: 36, speed: 125, damage: 22, range: 120, cd: 1.15, color: "#8e44ad", ranged: true },
    monk:    { name: "Cat Monk",    classId: "monk",    hp: 48, speed: 150, damage: 12, range: 34,  cd: 0.75, color: "#f39c12" },
    ram:     { name: "Siege Cat",   classId: "warrior", hp: 200, speed: 58, damage: 10, range: 28,  cd: 1.25, color: "#5d4037", isRam: true }
  };

  var ZONE_UNITS = {
    nymphs:  [CATS.monk, CATS.ranger, CATS.ram],
    village: [CATS.warrior, CATS.mage, CATS.ram],
    outpost: [CATS.ranger, CATS.warrior, CATS.ram]
  };

  function defSpawns() {
    if (typeof GameMap !== "undefined" && GameMap.SPAWNS) return GameMap.SPAWNS;
    return [
      { x: 120, y: 280, team: 0 }, { x: 1480, y: 280, team: 1 },
      { x: 120, y: 620, team: 0 }, { x: 1480, y: 620, team: 1 }
    ];
  }
  function defFlags() {
    if (typeof GameMap !== "undefined" && GameMap.FLAGS) return GameMap.FLAGS;
    return [
      { id: "camp_hq", name: "Camp HQ", x: 100, y: 450, radius: 48, team: 0 },
      { id: "castle_hq", name: "Castle HQ", x: 1500, y: 450, radius: 48, team: 1 },
      { id: "nymphs", name: "Nymphs", x: 520, y: 280, radius: 44, team: -1 },
      { id: "village", name: "Village", x: 800, y: 450, radius: 48, team: -1 },
      { id: "outpost", name: "Outpost", x: 1080, y: 620, radius: 44, team: -1 }
    ];
  }
  function defTowers() {
    if (typeof GameMap !== "undefined" && GameMap.TOWERS) return GameMap.TOWERS;
    return [
      { id: "t1", x: 260, y: 450, range: 150, damage: 12, cooldown: 1.2, team: 0 },
      { id: "t2", x: 1340, y: 450, range: 150, damage: 12, cooldown: 1.2, team: 1 }
    ];
  }
  function move(x, y, dx, dy, r) {
    if (typeof GameMap !== "undefined" && GameMap.tryMove) return GameMap.tryMove(x, y, dx, dy, r);
    if (typeof GameMap !== "undefined" && GameMap.resolveCircleCollision) return GameMap.resolveCircleCollision(x + dx, y + dy, r);
    return { x: x + dx, y: y + dy };
  }
  function clsOf(id) {
    if (typeof getClass === "function") try { return getClass(id); } catch (e) {}
    if (typeof CLASSES !== "undefined" && CLASSES[id]) return CLASSES[id];
    return { maxHp: 100, speedMul: 1, weapon: "sword", ability: { id: "whirlwind", name: "Whirlwind", damage: 32, range: 78 } };
  }
  function ultOf(cls) {
    if (!cls || !cls.ability) return null;
    var a = cls.ability;
    var id = a.id;
    if (typeof resolveAbilityId === "function") id = resolveAbilityId(id);
    if (id === "whirlwind" || id === "bash") return { id: "whirlwind", cost: 100, damage: a.damage || 32, radius: a.range || 78, shield: 20, stun: a.stun || 0.8 };
    if (id === "arrow_storm" || id === "volley") return { id: "arrow_storm", cost: 100, shots: a.shots || 7, spread: a.spread || 0.42, damage: a.damage || 18, speed: 520 };
    if (id === "arcane_blast" || id === "nova") return { id: "arcane_blast", cost: 100, radius: a.radius || 120, damage: a.damage || 42, push: 40 };
    if (id === "natures_blessing" || id === "restore") return { id: "natures_blessing", cost: 100, heal: a.heal || 50, radius: a.radius || 100, shield: a.shield || 25 };
    return null;
  }

  function init(configs) {
    console.log("[HostSim] init", (configs && configs.length) || 0);
    players = new Map();
    projectiles = [];
    npcs = [];
    inputs = new Map();
    spawns = new Map();
    killfeed = [];
    matchStart = performance.now() / 1000;
    matchOver = false;
    winnerName = null;
    events = [];
    npcId = 1;
    botTimer = {};

    var S = defSpawns();
    flags = defFlags().map(function (f) {
      var hq = f.id === "camp_hq" || f.id === "castle_hq";
      return {
        id: f.id, name: f.name, x: f.x, y: f.y, radius: f.radius,
        team: f.team != null ? f.team : -1, progress: 0, capturingTeam: -1,
        structureHp: hq ? HQ_MAX_HP : null, structureMax: hq ? HQ_MAX_HP : null
      };
    });
    towerCd = {};
    defTowers().forEach(function (t) { towerCd[t.id] = 0; });
    zoneTimer = { nymphs: 0, village: 0, outpost: 0 };

    var list = (configs && configs.length) ? configs : [{ id: "solo", name: "Solo", team: 0, classId: "warrior" }];
    list.forEach(function (cfg, i) {
      var team = cfg.team != null ? cfg.team : (i % 2);
      var classId = cfg.classId || "warrior";
      var c = clsOf(classId);
      var teamS = S.filter(function (s) { return s.team === team; });
      var sp = teamS[i % Math.max(1, teamS.length)] || S[0];
      var p = {
        id: cfg.id, name: cfg.name || "Player", colorIndex: i % 4,
        x: sp.x, y: sp.y, angle: 0, hp: c.maxHp || 100, maxHp: c.maxHp || 100,
        weapon: c.weapon || "sword", alive: true, score: 0,
        lastAttackAt: -999, respawnAt: 0, lastHitFlashAt: -999, lastAttackAnimAt: -999,
        team: team, classId: classId, speedMul: c.speedMul || 1,
        abilityCdUntil: 0, stunUntil: 0, ultimateCharge: 0, shield: 0,
        appearance: cfg.appearance || null
      };
      players.set(cfg.id, p);
      spawns.set(cfg.id, { team: team, x: sp.x, y: sp.y });
      console.log("[HostSim] player", cfg.id, classId, "team", team);
    });
    console.log("[HostSim] ready players", players.size);
  }

  function setInput(id, input) { inputs.set(id, input); }
  function markDisconnected(id) {
    var p = players.get(id);
    if (!p) return;
    p.alive = false; p.hp = 0; p.respawnAt = Infinity;
    inputs.delete(id);
  }

  function midFlags() {
    return flags.filter(function (f) {
      return f.id === "nymphs" || f.id === "village" || f.id === "outpost";
    });
  }

  function damage(unit, dmg, now, attacker) {
    if (!unit || !unit.alive) return;
    var d = dmg;
    if (unit.shield > 0) {
      var ab = Math.min(unit.shield, d);
      unit.shield -= ab;
      d -= ab;
    }
    unit.hp = Math.max(0, unit.hp - d);
    unit.lastHitFlashAt = now;
    events.push({ kind: "hit", x: unit.x, y: unit.y });
    unit.ultimateCharge = Math.min(ULT.max, (unit.ultimateCharge || 0) + d * ULT.take);
    if (attacker && attacker.id !== unit.id) {
      attacker.ultimateCharge = Math.min(ULT.max, (attacker.ultimateCharge || 0) + d * ULT.deal);
    }
    if (unit.hp <= 0) {
      unit.alive = false;
      if (unit.respawnAt !== undefined) unit.respawnAt = now + RESPAWN;
      events.push({ kind: "death", x: unit.x, y: unit.y });
      if (attacker && attacker.score != null) {
        attacker.score = (attacker.score || 0) + 1;
        killfeed.unshift({
          killerName: attacker.name || "?",
          targetName: unit.name || "?",
          weaponId: attacker.weapon || "sword",
          at: now
        });
        killfeed = killfeed.slice(0, 6);
      }
    }
  }

  function useUlt(player, now) {
    var ult = ultOf(clsOf(player.classId));
    if (!ult || (player.ultimateCharge || 0) < (ult.cost || 100)) return;
    player.ultimateCharge = 0;
    events.push({ kind: "ultimate", classId: player.classId, ultimateId: ult.id, x: player.x, y: player.y, angle: player.angle });

    if (ult.id === "whirlwind") {
      Array.from(players.values()).concat(npcs).forEach(function (t) {
        if (!t.alive || t.team === player.team || t.id === player.id) return;
        if (Math.hypot(t.x - player.x, t.y - player.y) <= (ult.radius || 70)) {
          damage(t, ult.damage || 32, now, player);
          if (ult.stun && t.stunUntil !== undefined) t.stunUntil = now + ult.stun;
        }
      });
      player.shield = (player.shield || 0) + (ult.shield || 20);
    } else if (ult.id === "arrow_storm") {
      var shots = ult.shots || 7, spread = ult.spread || 0.42;
      for (var s = 0; s < shots; s++) {
        var a = player.angle - spread / 2 + (spread * s) / Math.max(1, shots - 1);
        projectiles.push({
          x: player.x, y: player.y,
          vx: Math.cos(a) * (ult.speed || 520), vy: Math.sin(a) * (ult.speed || 520),
          damage: ult.damage || 18, ttl: 1.4, radius: 5,
          ownerId: player.id, ownerTeam: player.team, weaponId: "bow"
        });
      }
    } else if (ult.id === "arcane_blast") {
      Array.from(players.values()).concat(npcs).forEach(function (u) {
        if (!u.alive || u.team === player.team || u.id === player.id) return;
        var dist = Math.hypot(u.x - player.x, u.y - player.y);
        if (dist <= (ult.radius || 120)) {
          damage(u, Math.floor((ult.damage || 42) * (1 - dist / (ult.radius || 120) * 0.4)), now, player);
          if (ult.push && dist > 0) {
            var m = move(u.x, u.y, (u.x - player.x) / dist * ult.push, (u.y - player.y) / dist * ult.push, PR);
            u.x = m.x; u.y = m.y;
          }
        }
      });
    } else if (ult.id === "natures_blessing") {
      players.forEach(function (ally) {
        if (!ally.alive || ally.team !== player.team) return;
        if (Math.hypot(ally.x - player.x, ally.y - player.y) <= (ult.radius || 100)) {
          var before = ally.hp;
          ally.hp = Math.min(ally.maxHp, ally.hp + (ult.heal || 50));
          ally.shield = (ally.shield || 0) + (ult.shield || 25);
          events.push({ kind: "heal", x: ally.x, y: ally.y });
          var h = ally.hp - before;
          if (h > 0) player.ultimateCharge = Math.min(ULT.max, (player.ultimateCharge || 0) + h * ULT.heal);
        }
      });
    }
  }

  function updateBots(dt, now) {
    players.forEach(function (p) {
      if (!p.id || p.id.indexOf("bot-") !== 0 || !p.alive) return;
      if (p.stunUntil && now < p.stunUntil) return;
      botTimer[p.id] = (botTimer[p.id] || 0) - dt;
      if (botTimer[p.id] > 0) return;
      botTimer[p.id] = 0.3;

      var best = null, bestD = 900;
      players.forEach(function (o) {
        if (!o.alive || o.team === p.team || o.id === p.id) return;
        var d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < bestD) { bestD = d; best = o; }
      });
      npcs.forEach(function (n) {
        if (!n.alive || n.team === p.team) return;
        var d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < bestD) { bestD = d; best = n; }
      });

      var goal = best;
      if (!goal || bestD > 280) {
        midFlags().forEach(function (f) {
          if (f.team === p.team) return;
          if (!goal || Math.hypot(f.x - p.x, f.y - p.y) < Math.hypot(goal.x - p.x, goal.y - p.y)) goal = f;
        });
      }
      if (!goal) {
        flags.forEach(function (f) {
          if (p.team === 0 && f.id === "castle_hq") goal = f;
          if (p.team === 1 && f.id === "camp_hq") goal = f;
        });
      }
      if (!goal) return;

      var ang = Math.atan2(goal.y - p.y, goal.x - p.x);
      p.angle = ang;
      var spd = BASE_SPEED * (p.speedMul || 1) * dt;
      var m = move(p.x, p.y, Math.cos(ang) * spd, Math.sin(ang) * spd, PR);
      p.x = m.x; p.y = m.y;
      if ((p.ultimateCharge || 0) >= 90 && best && bestD < 140) useUlt(p, now);
      inputs.set(p.id, { dx: Math.cos(ang), dy: Math.sin(ang), angle: ang, attack: best && bestD < 90, weapon: p.weapon, ultimate: false });
    });
  }

  function updateFlags(dt) {
    for (var i = 0; i < flags.length; i++) {
      var f = flags[i];
      if (f.id === "camp_hq" || f.id === "castle_hq") continue;
      var c0 = 0, c1 = 0;
      players.forEach(function (p) {
        if (!p.alive) return;
        if (Math.hypot(p.x - f.x, p.y - f.y) <= f.radius) {
          if (p.team === 0) c0++; else c1++;
        }
      });
      if ((c0 > 0) !== (c1 > 0) && (c0 + c1) > 0) {
        var capt = c0 > 0 ? 0 : 1;
        if (f.team === capt) { f.progress = 0; f.capturingTeam = -1; }
        else {
          f.capturingTeam = capt;
          f.progress += dt / CAPTURE_TIME;
          if (f.progress >= 1) {
            var old = f.team;
            f.team = capt; f.progress = 0; f.capturingTeam = -1;
            npcs.forEach(function (n) {
              if (n.zoneId === f.id && n.team === old) { n.alive = false; n.hp = 0; }
            });
            zoneTimer[f.id] = 0;
            events.push({ kind: "capture", flagId: f.id, team: capt, x: f.x, y: f.y });
          }
        }
      } else {
        f.progress = Math.max(0, f.progress - dt / (CAPTURE_TIME * 0.8));
        if (f.progress <= 0) f.capturingTeam = -1;
      }
    }
  }

  function updateTowers(now) {
    defTowers().forEach(function (tw) {
      if (now < (towerCd[tw.id] || 0)) return;
      var best = null, bestD = tw.range;
      function consider(u) {
        if (!u.alive || u.team === tw.team) return;
        var d = Math.hypot(u.x - tw.x, u.y - tw.y);
        if (d < bestD) { bestD = d; best = u; }
      }
      players.forEach(consider);
      npcs.forEach(consider);
      if (best) {
        towerCd[tw.id] = now + tw.cooldown;
        damage(best, tw.damage, now, null);
        events.push({ kind: "tower_shot", x: tw.x, y: tw.y, tx: best.x, ty: best.y });
      }
    });
  }

  function countNpcs(zoneId, team) {
    var n = 0;
    for (var i = 0; i < npcs.length; i++) {
      if (npcs[i].alive && npcs[i].zoneId === zoneId && npcs[i].team === team) n++;
    }
    return n;
  }

  function spawnCats(dt) {
    midFlags().forEach(function (f) {
      if (f.team !== 0 && f.team !== 1) return;
      var units = ZONE_UNITS[f.id];
      if (!units) return;
      zoneTimer[f.id] = (zoneTimer[f.id] || 0) + dt;
      var owned = countNpcs(f.id, f.team);
      if (owned >= NPC_PER_ZONE || zoneTimer[f.id] < SPAWN_INTERVAL) return;
      zoneTimer[f.id] = 0;
      var def = units[owned] || units[0];
      npcs.push({
        id: "npc-" + (npcId++), name: def.name, team: f.team, zoneId: f.id,
        classId: def.classId, isCat: true, isRam: !!def.isRam, isRanged: !!def.ranged,
        x: f.x + (Math.random() - 0.5) * 40, y: f.y + (Math.random() - 0.5) * 40,
        angle: f.team === 0 ? 0 : Math.PI,
        hp: def.hp, maxHp: def.hp, alive: true,
        speed: def.speed, damage: def.damage, range: def.range,
        attackCooldown: def.cd, lastAttackAt: 0, color: def.color, stuckTimer: 0
      });
      events.push({ kind: "spawn", x: f.x, y: f.y, team: f.team, classId: def.classId });
    });
  }

  function updateNpcs(dt, now) {
    for (var i = 0; i < npcs.length; i++) {
      var n = npcs[i];
      if (!n.alive) continue;
      var target = null, bestD = n.isRam ? 1200 : 480;

      if (n.isRam) {
        flags.forEach(function (ff) {
          if (n.team === 0 && ff.id === "castle_hq") { target = { x: ff.x, y: ff.y, isStructure: true, flag: ff }; bestD = Math.hypot(ff.x - n.x, ff.y - n.y); }
          if (n.team === 1 && ff.id === "camp_hq") { target = { x: ff.x, y: ff.y, isStructure: true, flag: ff }; bestD = Math.hypot(ff.x - n.x, ff.y - n.y); }
        });
      }
      if (!n.isRam || bestD > 80) {
        players.forEach(function (p) {
          if (!p.alive || p.team === n.team) return;
          var d = Math.hypot(p.x - n.x, p.y - n.y);
          if (d < bestD) { bestD = d; target = p; }
        });
        npcs.forEach(function (o) {
          if (!o.alive || o.team === n.team || o.id === n.id) return;
          var d = Math.hypot(o.x - n.x, o.y - n.y);
          if (d < bestD) { bestD = d; target = o; }
        });
      }
      if (!target) continue;

      n.angle = Math.atan2(target.y - n.y, target.x - n.x);
      var rad = n.isRam ? 16 : 12;
      if (bestD > (n.range || 36)) {
        var m = move(n.x, n.y, Math.cos(n.angle) * n.speed * dt, Math.sin(n.angle) * n.speed * dt, rad);
        n.x = m.x; n.y = m.y;
      } else if (now - (n.lastAttackAt || 0) >= (n.attackCooldown || 0.9)) {
        n.lastAttackAt = now;
        if (target.isStructure && target.flag) {
          target.flag.structureHp = Math.max(0, (target.flag.structureHp || 0) - (n.isRam ? RAM_DMG : 8));
          if (target.flag.structureHp <= 0) {
            matchOver = true;
            winnerName = n.team === 0 ? "Camp" : "Castle";
          }
        } else {
          damage(target, n.damage || 12, now, null);
        }
      }
    }
    npcs = npcs.filter(function (n) { return n.alive; });
  }

  function updatePlayers(dt, now) {
    players.forEach(function (p) {
      if (!p.alive) {
        if (Number.isFinite(p.respawnAt) && now >= p.respawnAt) {
          var info = spawns.get(p.id);
          if (info) { p.x = info.x; p.y = info.y; }
          p.hp = p.maxHp; p.alive = true; p.shield = 0;
          p.ultimateCharge = Math.min(40, p.ultimateCharge || 0);
        }
        return;
      }
      if (p.stunUntil && now < p.stunUntil) return;

      var input = inputs.get(p.id) || { dx: 0, dy: 0, angle: p.angle, attack: false, weapon: p.weapon, ultimate: false };

      if (p.id.indexOf("bot-") !== 0) {
        var len = Math.hypot(input.dx || 0, input.dy || 0);
        if (len > 0.1) {
          var spd = BASE_SPEED * (p.speedMul || 1) * dt;
          var m = move(p.x, p.y, (input.dx / len) * spd, (input.dy / len) * spd, PR);
          p.x = m.x; p.y = m.y;
        }
        if (input.angle != null) p.angle = input.angle;
        if (input.weapon && typeof WEAPONS !== "undefined" && WEAPONS[input.weapon]) p.weapon = input.weapon;
      }

      if (input.attack) {
        var w = (typeof WEAPONS !== "undefined") ? WEAPONS[p.weapon] : null;
        if (w && now - (p.lastAttackAt || 0) >= (w.cooldown || 0.6)) {
          p.lastAttackAt = now;
          p.lastAttackAnimAt = now;
          if (w.type === "melee") {
            var half = ((w.angle || 60) * Math.PI / 180) / 2;
            Array.from(players.values()).concat(npcs).forEach(function (t) {
              if (!t.alive || t.team === p.team || t.id === p.id) return;
              var dist = Math.hypot(t.x - p.x, t.y - p.y);
              if (dist > (w.range || 50) + PR) return;
              var ang = Math.atan2(t.y - p.y, t.x - p.x);
              var diff = Math.abs(((ang - p.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
              if (diff > half) return;
              damage(t, w.damage || 30, now, p);
            });
          } else {
            var spd2 = w.speed || 480;
            projectiles.push({
              x: p.x, y: p.y,
              vx: Math.cos(p.angle) * spd2, vy: Math.sin(p.angle) * spd2,
              damage: w.damage || 30, ttl: 1.5, radius: 5,
              ownerId: p.id, ownerTeam: p.team, weaponId: p.weapon
            });
          }
        }
      }
      if (input.ultimate) useUlt(p, now);
    });
  }

  function updateProjectiles(dt, now) {
    var keep = [];
    for (var i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.ttl = (p.ttl || 2) - dt;
      if (p.ttl <= 0) continue;
      if (typeof GameMap !== "undefined" && GameMap.pointBlocked && GameMap.pointBlocked(p.x, p.y)) continue;
      var hit = false;
      var all = Array.from(players.values()).concat(npcs);
      for (var j = 0; j < all.length; j++) {
        var t = all[j];
        if (!t.alive || t.id === p.ownerId || t.team === p.ownerTeam) continue;
        if (Math.hypot(t.x - p.x, t.y - p.y) <= PR + (p.radius || 5)) {
          damage(t, p.damage || 30, now, players.get(p.ownerId));
          hit = true;
          break;
        }
      }
      if (!hit) keep.push(p);
    }
    projectiles = keep;
  }

  function checkWin(now) {
    if (matchOver) return;
    if (now - matchStart >= MATCH_DURATION) {
      matchOver = true;
      var camp = 0, castle = 0;
      flags.forEach(function (f) {
        if (f.id === "camp_hq") camp += f.structureHp || 0;
        if (f.id === "castle_hq") castle += f.structureHp || 0;
        if (f.team === 0) camp += 50;
        if (f.team === 1) castle += 50;
      });
      winnerName = camp >= castle ? "Camp" : "Castle";
      return;
    }
    flags.forEach(function (f) {
      if (f.structureHp != null && f.structureHp <= 0) {
        matchOver = true;
        winnerName = f.id === "camp_hq" ? "Castle" : "Camp";
      }
    });
  }

  function tick(dt) {
    if (matchOver) return;
    var now = performance.now() / 1000;
    events = [];
    updateBots(dt, now);
    updatePlayers(dt, now);
    updateProjectiles(dt, now);
    updateFlags(dt);
    updateTowers(now);
    spawnCats(dt);
    updateNpcs(dt, now);
    checkWin(now);
  }

  function getSnapshotPayload() {
    var now = performance.now() / 1000;
    return {
      players: Array.from(players.values()).map(function (p) {
        return {
          id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle,
          hp: p.hp, maxHp: p.maxHp, weapon: p.weapon, alive: p.alive,
          team: p.team, classId: p.classId, score: p.score || 0,
          ultimateCharge: p.ultimateCharge || 0, shield: p.shield || 0,
          appearance: p.appearance, lastHitFlashAt: p.lastHitFlashAt,
          lastAttackAnimAt: p.lastAttackAnimAt, colorIndex: p.colorIndex
        };
      }),
      projectiles: projectiles.slice(),
      npcs: npcs.filter(function (n) { return n.alive; }).map(function (n) {
        return {
          id: n.id, name: n.name, x: n.x, y: n.y, angle: n.angle,
          hp: n.hp, maxHp: n.maxHp, alive: true, team: n.team,
          color: n.color, isRam: n.isRam, isCat: true, classId: n.classId
        };
      }),
      flags: flags.map(function (f) {
        return {
          id: f.id, name: f.name, x: f.x, y: f.y, radius: f.radius,
          team: f.team, progress: f.progress, capturingTeam: f.capturingTeam,
          structureHp: f.structureHp, structureMax: f.structureMax
        };
      }),
      killfeed: killfeed.slice(0, 6),
      timeLeft: Math.max(0, MATCH_DURATION - (now - matchStart)),
      matchOver: matchOver,
      winnerName: winnerName,
      events: events.slice()
    };
  }

  console.log("[HostSim] module ready");
  return {
    init: init,
    setInput: setInput,
    markDisconnected: markDisconnected,
    tick: tick,
    getSnapshotPayload: getSnapshotPayload
  };
})();
