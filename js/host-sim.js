/**
 * host-sim.js — Class skill kits + cats + conquest.
 */
var HostSim = (function () {
  console.log("[HostSim] loading skill kits…");

  var MATCH_DURATION = 480;
  var CAPTURE_TIME = 3.0;
  var NPC_PER_ZONE = 3;
  var SPAWN_INTERVAL = 5.0;
  var HQ_MAX_HP = 280;
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

  function nowSec() { return performance.now() / 1000; }

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

  function clsOf(id) {
    if (typeof getClass === "function") return getClass(id);
    return { id: id || "warrior", maxHp: 100, speedMul: 1, skills: [], ability: null, weapon: "sword" };
  }

  function weaponOf(id) {
    if (typeof WEAPONS !== "undefined" && WEAPONS[id]) return WEAPONS[id];
    return { id: id || "sword", type: "melee", damage: 18, range: 42, cooldown: 0.55, angle: 70 };
  }

  function angleDiff(a, b) {
    var d = Math.abs(a - b) % (Math.PI * 2);
    return d > Math.PI ? Math.PI * 2 - d : d;
  }

  function playersArr() {
    return Array.from(players.values());
  }

  function alliesOf(p) {
    return playersArr().filter(function (o) {
      return o.alive && o.team === p.team && o.id !== p.id;
    });
  }

  function enemiesOf(p) {
    return playersArr().filter(function (o) {
      return o.alive && o.team !== p.team;
    });
  }

  function nearestInCone(list, p, range, halfAngle) {
    var best = null;
    var bestD = range + 1;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var dx = t.x - p.x;
      var dy = t.y - p.y;
      var d = Math.hypot(dx, dy);
      if (d > range) continue;
      if (halfAngle != null && angleDiff(Math.atan2(dy, dx), p.angle) > halfAngle) continue;
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  function nearestInRange(list, p, range) {
    return nearestInCone(list, p, range, null);
  }

  function pushProj(owner, angle, speed, damage, ttl, radius, extra) {
    var pr = {
      id: "p" + Math.random().toString(36).slice(2, 8),
      ownerId: owner.id,
      team: owner.team,
      x: owner.x + Math.cos(angle) * 18,
      y: owner.y + Math.sin(angle) * 18,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: damage,
      ttl: ttl || 1.2,
      radius: radius || 5,
      weaponId: (extra && extra.weaponId) || "bow",
      burnDps: extra && extra.burnDps,
      burnDuration: extra && extra.burnDuration,
      guaranteed: !!(extra && extra.guaranteed),
      slowMul: extra && extra.slowMul,
      slowDuration: extra && extra.slowDuration
    };
    projectiles.push(pr);
    return pr;
  }

  function aoeDamage(x, y, radius, amount, attacker, onlyEnemies) {
    var list = playersArr().concat(npcs);
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t.alive) continue;
      if (onlyEnemies && t.team === attacker.team) continue;
      if (t.id === attacker.id) continue;
      if (Math.hypot(t.x - x, t.y - y) <= radius + PR) {
        hurt(t, amount, attacker);
      }
    }
  }

  function hurt(unit, d, attacker) {
    if (!unit || !unit.alive || d <= 0) return false;
    var n = nowSec();

    // Guard / block
    if (unit.blockUntil && n < unit.blockUntil) {
      events.push({ kind: "block", x: unit.x, y: unit.y, targetId: unit.id });
      return false;
    }

    // Dodge
    var dodge = unit.dodgeChance || 0;
    if (unit.dodgeBoostUntil && n < unit.dodgeBoostUntil) {
      dodge = Math.max(dodge, unit.dodgeBoost || 0.5);
    }
    if (unit.teamAegisUntil && n < unit.teamAegisUntil) {
      dodge = Math.max(dodge, unit.teamAegisDodge || 0.5);
    }
    if (dodge > 0 && Math.random() < dodge) {
      events.push({ kind: "dodge", x: unit.x, y: unit.y, targetId: unit.id });
      return false;
    }

    // Damage reduce (ward)
    if (unit.wardUntil && n < unit.wardUntil && unit.wardReduce) {
      d = d * (1 - unit.wardReduce);
    }

    if (unit.shield > 0) {
      var ab = Math.min(unit.shield, d);
      unit.shield -= ab;
      d -= ab;
    }
    if (d <= 0) return false;

    unit.hp = Math.max(0, unit.hp - d);
    unit.lastHitFlashAt = n;
    unit.ultimateCharge = Math.min(ULT.max, (unit.ultimateCharge || 0) + d * ULT.take);
    if (attacker && attacker.ultimateCharge != null) {
      attacker.ultimateCharge = Math.min(ULT.max, (attacker.ultimateCharge || 0) + d * ULT.deal);
    }

    if (unit.hp <= 0) {
      unit.alive = false;
      unit.respawnAt = n + RESPAWN;
      if (attacker) {
        attacker.score = (attacker.score || 0) + 1;
        killfeed.unshift({
          killerName: attacker.name || "?",
          targetName: unit.name || "?",
          weaponId: attacker.weapon || "sword",
          at: n
        });
        if (killfeed.length > 6) killfeed.length = 6;
      }
      events.push({ kind: "kill", x: unit.x, y: unit.y, targetId: unit.id, attackerId: attacker && attacker.id });
      return true;
    }
    return false;
  }

  function canUseSkill(p, idx, n) {
    if (!p.skillCd) p.skillCd = [0, 0, 0];
    return n >= (p.skillCd[idx] || 0);
  }

  function setSkillCd(p, idx, cd) {
    if (!p.skillCd) p.skillCd = [0, 0, 0];
    p.skillCd[idx] = nowSec() + cd;
  }

  function useSkill(p, idx, n) {
    var cls = clsOf(p.classId);
    var sk = cls.skills && cls.skills[idx];
    if (!sk || !canUseSkill(p, idx, n)) return;
    if (p.stunUntil && n < p.stunUntil) return;

    setSkillCd(p, idx, sk.cooldown || 3);
    events.push({ kind: "skill", skillId: sk.id, classId: p.classId, x: p.x, y: p.y, angle: p.angle });

    // —— WARRIOR ——
    if (sk.id === "thrust") {
      var w = weaponOf(p.weapon);
      var dmg = Math.round((w.damage || 18) * (sk.damageMul || 1.65));
      var t = nearestInCone(enemiesOf(p).concat(npcs.filter(function (x) { return x.alive && x.team !== p.team; })), p, sk.range || 48, 0.55);
      if (t) hurt(t, dmg, p);
      p.lastAttackAnimAt = n;
    } else if (sk.id === "guard") {
      p.blockUntil = n + (sk.duration || 1.25);
      events.push({ kind: "guard", x: p.x, y: p.y, targetId: p.id });
    } else if (sk.id === "cleave") {
      aoeDamage(p.x, p.y, sk.range || 62, sk.damage || 30, p, true);
      p.lastAttackAnimAt = n;
    }

    // —— RANGER ——
    else if (sk.id === "precise_shot") {
      pushProj(p, p.angle, 480, sk.damage || 38, 1.4, 6, {
        weaponId: "bow", guaranteed: true
      });
    } else if (sk.id === "arrow_rain") {
      var shots = sk.shots || 6;
      var spread = sk.spread || 0.55;
      for (var i = 0; i < shots; i++) {
        var a = p.angle - spread / 2 + (spread * i) / Math.max(1, shots - 1);
        pushProj(p, a, 400, sk.damage || 14, 1.1, 4, { weaponId: "bow" });
      }
    } else if (sk.id === "sidestep") {
      p.dodgeBoostUntil = n + (sk.duration || 0.9);
      p.dodgeBoost = sk.dodgeBoost || 0.55;
    }

    // —— MONK ——
    else if (sk.id === "heal_front") {
      var ally = nearestInCone(alliesOf(p), p, sk.range || 90, 0.9);
      if (!ally) ally = p;
      var heal = Math.round((ally.maxHp || 100) * (sk.healPct || 0.08));
      ally.hp = Math.min(ally.maxHp || 100, ally.hp + heal);
      p.ultimateCharge = Math.min(ULT.max, (p.ultimateCharge || 0) + heal * ULT.heal);
      events.push({ kind: "heal", x: ally.x, y: ally.y, targetId: ally.id, amount: heal });
    } else if (sk.id === "ward") {
      var wardTarget = nearestInCone(alliesOf(p), p, sk.range || 100, 1.0) || p;
      wardTarget.wardUntil = n + (sk.duration || 2);
      wardTarget.wardReduce = sk.damageReduce || 0.2;
      events.push({ kind: "ward", x: wardTarget.x, y: wardTarget.y, targetId: wardTarget.id });
    } else if (sk.id === "group_heal") {
      var rad = sk.radius || 140;
      var group = [p].concat(alliesOf(p));
      for (var g = 0; g < group.length; g++) {
        var al = group[g];
        if (Math.hypot(al.x - p.x, al.y - p.y) > rad) continue;
        var h = Math.round((al.maxHp || 100) * (sk.healPct || 0.1));
        al.hp = Math.min(al.maxHp || 100, al.hp + h);
        events.push({ kind: "heal", x: al.x, y: al.y, targetId: al.id, amount: h });
      }
    }

    // —— MAGE ——
    else if (sk.id === "energy_bolt") {
      pushProj(p, p.angle, sk.speed || 420, sk.damage || 22, 1.0, 6, { weaponId: "arcane" });
    } else if (sk.id === "fire_rain") {
      var fx = p.x + Math.cos(p.angle) * (sk.range || 160);
      var fy = p.y + Math.sin(p.angle) * (sk.range || 160);
      aoeDamage(fx, fy, sk.radius || 70, sk.damage || 28, p, true);
      events.push({ kind: "fire_rain", x: fx, y: fy, radius: sk.radius || 70 });
    } else if (sk.id === "frost") {
      var ft = nearestInCone(enemiesOf(p), p, sk.range || 220, 0.5);
      if (ft) {
        hurt(ft, sk.damage || 12, p);
        ft.slowUntil = n + (sk.duration || 2.5);
        ft.slowMul = sk.slowMul || 0.45;
        events.push({ kind: "frost", x: ft.x, y: ft.y, targetId: ft.id });
      }
    }
  }

  function useUlt(p, n) {
    var cls = clsOf(p.classId);
    var ult = cls.ability;
    if (!ult || (p.ultimateCharge || 0) < (ult.cost || 100)) return;
    if (p.stunUntil && n < p.stunUntil) return;

    p.ultimateCharge = 0;
    events.push({ kind: "ultimate", ultimateId: ult.id, classId: p.classId, x: p.x, y: p.y, angle: p.angle });

    if (ult.id === "fury") {
      p.furyUntil = n + (ult.duration || 5);
      p.furyAtkMul = ult.atkSpeedMul || 1.55;
      p.furySpeedMul = ult.speedMul || 1.30;
    } else if (ult.id === "fire_arrow") {
      pushProj(p, p.angle, 500, ult.damage || 22, 1.5, 7, {
        weaponId: "fire_arrow",
        burnDps: ult.burnDps || 10,
        burnDuration: ult.burnDuration || 2
      });
    } else if (ult.id === "aegis") {
      var team = [p].concat(alliesOf(p));
      var R = ult.radius || 160;
      for (var i = 0; i < team.length; i++) {
        if (Math.hypot(team[i].x - p.x, team[i].y - p.y) > R) continue;
        team[i].teamAegisUntil = n + (ult.duration || 2.2);
        team[i].teamAegisDodge = ult.teamDodge || 0.55;
      }
    } else if (ult.id === "meteor") {
      var mx = p.x + Math.cos(p.angle) * (ult.range || 140);
      var my = p.y + Math.sin(p.angle) * (ult.range || 140);
      var count = ult.count || 5;
      for (var m = 0; m < count; m++) {
        var ox = mx + (Math.random() - 0.5) * 90;
        var oy = my + (Math.random() - 0.5) * 90;
        aoeDamage(ox, oy, ult.radius || 55, ult.damage || 26, p, true);
        events.push({ kind: "meteor", x: ox, y: oy, radius: ult.radius || 55 });
      }
    }
  }

  function init(playerConfigs) {
    players.clear();
    projectiles = [];
    npcs = [];
    inputs.clear();
    spawns.clear();
    killfeed = [];
    events = [];
    matchOver = false;
    winnerName = null;
    matchStart = nowSec();
    npcId = 1;
    towerCd = {};
    zoneTimer = {};
    botTimer = {};

    var spawnList = defSpawns();
    flags = defFlags().map(function (f) {
      return {
        id: f.id, name: f.name, x: f.x, y: f.y, radius: f.radius,
        team: f.team, progress: 0,
        structureHp: (f.id.indexOf("hq") >= 0) ? HQ_MAX_HP : null,
        structureMax: (f.id.indexOf("hq") >= 0) ? HQ_MAX_HP : null
      };
    });

    (playerConfigs || []).forEach(function (cfg, idx) {
      var classId = cfg.classId || "warrior";
      var cls = clsOf(classId);
      var team = cfg.team != null ? cfg.team : (idx % 2);
      var sp = spawnList.filter(function (s) { return s.team === team; });
      if (!sp.length) sp = spawnList;
      var s = sp[idx % sp.length];
      spawns.set(cfg.id, idx);

      var isBot = String(cfg.id).indexOf("bot") === 0;
      players.set(cfg.id, {
        id: cfg.id,
        name: cfg.name || "Hunter",
        classId: classId,
        team: team,
        x: s.x, y: s.y,
        angle: team === 0 ? 0 : Math.PI,
        hp: cls.maxHp || 100,
        maxHp: cls.maxHp || 100,
        alive: true,
        score: 0,
        weapon: cls.weapon || "sword",
        appearance: cfg.appearance || null,
        ultimateCharge: 0,
        shield: 0,
        skillCd: [0, 0, 0],
        dodgeChance: cls.dodgeChance || 0,
        lastAttackAt: 0,
        lastAttackAnimAt: 0,
        lastHitFlashAt: -999,
        isBot: isBot
      });
      console.log("[HostSim] player", cfg.id, classId, "team", team);
    });

    console.log("[HostSim] init players=", players.size);
  }

  function setInput(id, input) {
    inputs.set(id, input || {});
  }

  function updateBots(n) {
    players.forEach(function (p) {
      if (!p.isBot || !p.alive) return;
      if (p.stunUntil && n < p.stunUntil) return;
      var t = botTimer[p.id] || 0;
      if (n < t) return;
      botTimer[p.id] = n + 0.25;

      var enemies = enemiesOf(p);
      var best = null;
      var bestD = 9999;
      for (var i = 0; i < enemies.length; i++) {
        var d = Math.hypot(enemies[i].x - p.x, enemies[i].y - p.y);
        if (d < bestD) { bestD = d; best = enemies[i]; }
      }
      var ang = best ? Math.atan2(best.y - p.y, best.x - p.x) : p.angle;
      var wantUlt = (p.ultimateCharge || 0) >= 95 && best && bestD < 160;
      inputs.set(p.id, {
        dx: Math.cos(ang), dy: Math.sin(ang), angle: ang,
        attack: best && bestD < 100,
        skill0: best && bestD < 80 && Math.random() < 0.08,
        skill1: Math.random() < 0.04,
        skill2: Math.random() < 0.04,
        ultimate: wantUlt
      });
    });
  }

  function updateProjectiles(dt, n) {
    var survivors = [];
    for (var i = 0; i < projectiles.length; i++) {
      var pr = projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.ttl -= dt;
      if (pr.ttl <= 0) continue;
      if (typeof GameMap !== "undefined" && GameMap.pointBlocked && GameMap.pointBlocked(pr.x, pr.y)) continue;

      var hit = false;
      var targets = playersArr().concat(npcs);
      for (var j = 0; j < targets.length; j++) {
        var t = targets[j];
        if (!t.alive || t.id === pr.ownerId || t.team === pr.team) continue;
        if (Math.hypot(t.x - pr.x, t.y - pr.y) <= PR + (pr.radius || 5)) {
          var attacker = players.get(pr.ownerId);
          hurt(t, pr.damage, attacker);
          if (pr.burnDps && pr.burnDuration) {
            t.burnUntil = n + pr.burnDuration;
            t.burnDps = pr.burnDps;
            t.burnAttackerId = pr.ownerId;
          }
          if (pr.slowMul && pr.slowDuration) {
            t.slowUntil = n + pr.slowDuration;
            t.slowMul = pr.slowMul;
          }
          hit = true;
          break;
        }
      }
      if (!hit) survivors.push(pr);
    }
    projectiles = survivors;
  }

  function updateFlags(dt, n) {
    for (var i = 0; i < flags.length; i++) {
      var f = flags[i];
      if (f.id.indexOf("hq") >= 0) continue;
      var present = { 0: 0, 1: 0 };
      playersArr().forEach(function (p) {
        if (!p.alive) return;
        if (Math.hypot(p.x - f.x, p.y - f.y) <= f.radius) present[p.team] = (present[p.team] || 0) + 1;
      });
      var c0 = present[0] || 0;
      var c1 = present[1] || 0;
      if (c0 > 0 && c1 === 0) {
        if (f.team === 0) f.progress = 1;
        else {
          f.progress = Math.min(1, (f.progress || 0) + dt / CAPTURE_TIME);
          if (f.progress >= 1) { f.team = 0; f.progress = 1; }
        }
      } else if (c1 > 0 && c0 === 0) {
        if (f.team === 1) f.progress = 1;
        else {
          f.progress = Math.min(1, (f.progress || 0) + dt / CAPTURE_TIME);
          if (f.progress >= 1) { f.team = 1; f.progress = 1; }
        }
      } else {
        f.progress = Math.max(0, (f.progress || 0) - dt / CAPTURE_TIME);
      }

      // NPC spawn from captured zones
      if (f.team === 0 || f.team === 1) {
        zoneTimer[f.id] = (zoneTimer[f.id] || 0) + dt;
        if (zoneTimer[f.id] >= SPAWN_INTERVAL) {
          zoneTimer[f.id] = 0;
          var living = npcs.filter(function (x) { return x.alive && x.zoneId === f.id; }).length;
          if (living < NPC_PER_ZONE) {
            var pool = ZONE_UNITS[f.id] || [CATS.warrior];
            var def = pool[Math.floor(Math.random() * pool.length)];
            npcs.push({
              id: "npc-" + (npcId++),
              name: def.name,
              classId: def.classId,
              team: f.team,
              zoneId: f.id,
              x: f.x + (Math.random() - 0.5) * 40,
              y: f.y + (Math.random() - 0.5) * 40,
              angle: 0,
              hp: def.hp,
              maxHp: def.hp,
              alive: true,
              speed: def.speed,
              damage: def.damage,
              range: def.range,
              attackCooldown: def.cd,
              lastAttackAt: 0,
              color: def.color,
              isCat: true,
              isRam: !!def.isRam,
              isRanged: !!def.ranged
            });
          }
        }
      }
    }
  }

  function updateNpcs(dt, n) {
    for (var i = 0; i < npcs.length; i++) {
      var c = npcs[i];
      if (!c.alive) continue;
      var targets = playersArr().filter(function (p) { return p.alive && p.team !== c.team; });
      var best = null;
      var bestD = 9999;
      for (var j = 0; j < targets.length; j++) {
        var d = Math.hypot(targets[j].x - c.x, targets[j].y - c.y);
        if (d < bestD) { bestD = d; best = targets[j]; }
      }
      if (!best) continue;
      c.angle = Math.atan2(best.y - c.y, best.x - c.x);
      if (bestD > (c.range || 40) * 0.85) {
        var sp = c.speed * dt;
        var nx = c.x + Math.cos(c.angle) * sp;
        var ny = c.y + Math.sin(c.angle) * sp;
        if (typeof GameMap !== "undefined" && GameMap.tryMove) {
          var m = GameMap.tryMove(c.x, c.y, nx - c.x, ny - c.y, 12);
          c.x = m.x; c.y = m.y;
        } else {
          c.x = nx; c.y = ny;
        }
      } else if (n - (c.lastAttackAt || 0) >= (c.attackCooldown || 1)) {
        c.lastAttackAt = n;
        if (c.isRanged) {
          pushProj(c, c.angle, 320, c.damage, 1.0, 4, { weaponId: "bow" });
        } else {
          hurt(best, c.damage, c);
        }
      }
    }
  }

  function updateTowers(n) {
    var towers = defTowers();
    for (var i = 0; i < towers.length; i++) {
      var tw = towers[i];
      if (n < (towerCd[tw.id] || 0)) continue;
      var targets = playersArr().filter(function (p) {
        return p.alive && p.team !== tw.team && Math.hypot(p.x - tw.x, p.y - tw.y) <= tw.range;
      });
      if (!targets.length) continue;
      var t = targets[0];
      hurt(t, tw.damage, { id: "tower-" + tw.id, name: "Tower", team: tw.team });
      towerCd[tw.id] = n + (tw.cooldown || 1.2);
    }
  }

  function tick(dt) {
    if (matchOver) return getSnapshot();
    var n = nowSec();
    events = [];

    updateBots(n);
    updateFlags(dt, n);
    updateNpcs(dt, n);
    updateTowers(n);
    updateProjectiles(dt, n);

    // Burn ticks
    playersArr().forEach(function (p) {
      if (p.burnUntil && n < p.burnUntil && p.alive) {
        var bd = (p.burnDps || 8) * dt;
        var atk = players.get(p.burnAttackerId);
        hurt(p, bd, atk);
      }
    });

    players.forEach(function (p) {
      if (!p.alive) {
        if (p.respawnAt && n >= p.respawnAt) {
          var spawnList = defSpawns().filter(function (s) { return s.team === p.team; });
          var s = spawnList[0] || defSpawns()[0];
          p.x = s.x; p.y = s.y;
          p.hp = p.maxHp;
          p.alive = true;
          p.shield = 0;
        }
        return;
      }
      if (p.stunUntil && n < p.stunUntil) return;

      var input = inputs.get(p.id) || {};
      p.angle = input.angle != null ? input.angle : p.angle;

      var cls = clsOf(p.classId);
      var speed = BASE_SPEED * (cls.speedMul || 1);
      if (p.furyUntil && n < p.furyUntil) speed *= (p.furySpeedMul || 1.3);
      if (p.slowUntil && n < p.slowUntil) speed *= (p.slowMul || 0.5);

      var dx = (input.dx || 0);
      var dy = (input.dy || 0);
      var len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      var mx = dx * speed * dt;
      var my = dy * speed * dt;
      if (typeof GameMap !== "undefined" && GameMap.tryMove) {
        var moved = GameMap.tryMove(p.x, p.y, mx, my, PR);
        p.x = moved.x; p.y = moved.y;
      } else {
        p.x += mx; p.y += my;
      }

      // Skills
      if (input.skill0) useSkill(p, 0, n);
      if (input.skill1) useSkill(p, 1, n);
      if (input.skill2) useSkill(p, 2, n);
      if (input.ultimate) useUlt(p, n);

      // Basic attack (monk has none)
      if (input.attack && !cls.noBasicAttack) {
        var w = weaponOf(p.weapon || cls.weapon);
        var cd = w.cooldown || 0.55;
        if (p.furyUntil && n < p.furyUntil) cd /= (p.furyAtkMul || 1.5);
        if (n - (p.lastAttackAt || 0) >= cd) {
          p.lastAttackAt = n;
          p.lastAttackAnimAt = n;
          if (w.type === "melee") {
            var foes = enemiesOf(p).concat(npcs.filter(function (x) { return x.alive && x.team !== p.team; }));
            for (var fi = 0; fi < foes.length; fi++) {
              var foe = foes[fi];
              var dist = Math.hypot(foe.x - p.x, foe.y - p.y);
              if (dist > (w.range || 42) + PR) continue;
              if (angleDiff(Math.atan2(foe.y - p.y, foe.x - p.x), p.angle) > ((w.angle || 70) * Math.PI / 180) / 2) continue;
              hurt(foe, w.damage || 18, p);
            }
          } else {
            pushProj(p, p.angle, 400, w.damage || 16, 1.1, 5, { weaponId: w.id || "bow" });
          }
        }
      }
    });

    // HQ damage from rams near HQ flags
    flags.forEach(function (f) {
      if (!f.structureHp) return;
      npcs.forEach(function (c) {
        if (!c.alive || !c.isRam || c.team === f.team) return;
        if (Math.hypot(c.x - f.x, c.y - f.y) < f.radius + 20) {
          f.structureHp = Math.max(0, f.structureHp - 18 * dt);
        }
      });
    });

    // Win conditions
    var timeLeft = Math.max(0, MATCH_DURATION - (n - matchStart));
    var campHq = flags.find(function (f) { return f.id === "camp_hq"; });
    var castleHq = flags.find(function (f) { return f.id === "castle_hq"; });
    if (campHq && campHq.structureHp <= 0) {
      matchOver = true; winnerName = "Castle";
    } else if (castleHq && castleHq.structureHp <= 0) {
      matchOver = true; winnerName = "Camp";
    } else if (timeLeft <= 0) {
      matchOver = true;
      var c0 = flags.filter(function (f) { return f.team === 0; }).length;
      var c1 = flags.filter(function (f) { return f.team === 1; }).length;
      winnerName = c0 >= c1 ? "Camp" : "Castle";
    }

    return getSnapshot();
  }

  function getSnapshot() {
    var n = nowSec();
    return {
      timeLeft: Math.max(0, MATCH_DURATION - (n - matchStart)),
      matchOver: matchOver,
      winnerName: winnerName,
      players: playersArr().map(function (p) {
        return {
          id: p.id, name: p.name, x: p.x, y: p.y, angle: p.angle,
          hp: p.hp, maxHp: p.maxHp, alive: p.alive, team: p.team,
          classId: p.classId, score: p.score || 0,
          ultimateCharge: p.ultimateCharge || 0,
          shield: p.shield || 0,
          skillCd: p.skillCd ? p.skillCd.slice() : [0, 0, 0],
          appearance: p.appearance,
          weapon: p.weapon,
          lastAttackAnimAt: p.lastAttackAnimAt,
          lastHitFlashAt: p.lastHitFlashAt,
          blockUntil: p.blockUntil,
          furyUntil: p.furyUntil,
          stunUntil: p.stunUntil
        };
      }),
      npcs: npcs.filter(function (c) { return c.alive; }).map(function (c) {
        return {
          id: c.id, name: c.name, x: c.x, y: c.y, angle: c.angle,
          hp: c.hp, maxHp: c.maxHp, alive: true, team: c.team,
          color: c.color, isRam: c.isRam, isCat: true, classId: c.classId
        };
      }),
      projectiles: projectiles.map(function (pr) {
        return { x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, radius: pr.radius, weaponId: pr.weaponId, team: pr.team };
      }),
      flags: flags.map(function (f) {
        return {
          id: f.id, name: f.name, x: f.x, y: f.y, radius: f.radius,
          team: f.team, progress: f.progress || 0,
          structureHp: f.structureHp, structureMax: f.structureMax
        };
      }),
      killfeed: killfeed.slice(),
      events: events.slice()
    };
  }

  console.log("[HostSim] ready — skill kits");
  return {
    init: init,
    setInput: setInput,
    tick: tick,
    getSnapshot: getSnapshot
  };
})();
