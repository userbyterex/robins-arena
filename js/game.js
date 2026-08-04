/**
 * game.js — Render + host tick + skill VFX
 */
var Game = (function () {
  console.log("[Game] loading…");

  var canvas, ctx, localPlayerId, isHost, isSolo, running = false;
  var lastTime = 0;
  var tickRate = 1 / 20;
  var accumulator = 0;
  var localInput = {
    dx: 0, dy: 0, angle: 0, attack: false, weapon: "sword",
    skill0: false, skill1: false, skill2: false, ultimate: false
  };
  var state = {
    players: [], projectiles: [], npcs: [], flags: [],
    killfeed: [], timeLeft: 480, matchOver: false, events: []
  };
  var shake = { x: 0, y: 0, intensity: 0, decay: 18 };
  var floatingTexts = [];
  var lightFlashes = [];
  var damageFlashEl = null;
  var _frame = 0;
  var prevKillfeedLen = 0;

  function init(opts) {
    canvas = opts.canvas;
    if (!canvas) return;
    canvas.width = window.innerWidth || 960;
    canvas.height = window.innerHeight || 640;
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    localPlayerId = opts.localPlayerId;
    isHost = !!opts.isHost;
    isSolo = !!opts.isSolo;
    damageFlashEl = document.getElementById("damage-flash");

    if (typeof Camera !== "undefined" && Camera.setViewport) {
      Camera.setViewport(canvas.width, canvas.height);
    }

    HostSim.init(opts.playerConfigs || []);

    // Ability bar icons for local class
    var localCfg = (opts.playerConfigs || []).filter(function (c) {
      return c.id === localPlayerId;
    })[0];
    if (typeof AbilityInput !== "undefined") {
      AbilityInput.init();
      if (localCfg) AbilityInput.setClass(localCfg.classId || "warrior");
    }

    if (!isSolo && !isHost && typeof ClientSync !== "undefined" && ClientSync.init) {
      ClientSync.init(onSnapshotEvents);
    }

    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
    console.log("[Game] started");
  }

  function stop() { running = false; }

  function setInput(input) {
    localInput = input || localInput;
  }

  function getLocalPlayer() {
    if (!state.players) return null;
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === localPlayerId) return state.players[i];
    }
    return null;
  }

  function addShake(amount) {
    shake.intensity = Math.min(shake.intensity + amount, 16);
  }

  function updateShake(dt) {
    if (shake.intensity > 0.1) {
      shake.x = (Math.random() - 0.5) * shake.intensity * 2;
      shake.y = (Math.random() - 0.5) * shake.intensity * 2;
      shake.intensity -= shake.decay * dt;
    } else {
      shake.intensity = 0;
      shake.x = 0;
      shake.y = 0;
    }
  }

  function addFloat(x, y, text, color) {
    floatingTexts.push({
      x: x, y: y, text: text, color: color || "#fff",
      life: 0.9, vy: -40
    });
  }

  function addFlash(x, y, color, radius, life) {
    lightFlashes.push({
      x: x, y: y, color: color || "#c9a227",
      radius: radius || 40, life: life || 0.35, maxLife: life || 0.35
    });
  }

  function processEvent(ev) {
    if (!ev || !ev.kind) return;
    try {
      switch (ev.kind) {
        case "hit":
        case "kill":
          if (typeof Particles !== "undefined" && Particles.hitSpark) Particles.hitSpark(ev.x, ev.y);
          addShake(ev.kind === "kill" ? 4 : 1.5);
          break;
        case "ultimate":
          addShake(7);
          addFlash(ev.x, ev.y, "#c9a227", 90, 0.5);
          if (typeof Particles !== "undefined" && Particles.spawn) {
            for (var i = 0; i < 12; i++) {
              Particles.spawn({
                x: ev.x, y: ev.y,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                life: 0.6, size: 5 + Math.random() * 6,
                color: "#f0d060", gravity: 20, shape: "circle", fade: true
              });
            }
          }
          break;
        case "skill":
          addFlash(ev.x, ev.y, "#e8dcc0", 36, 0.25);
          addShake(2);
          break;
        case "heal":
          addFloat(ev.x, ev.y - 20, "+" + (ev.amount || ""), "#3d9e58");
          addFlash(ev.x, ev.y, "#3d9e58", 30, 0.3);
          break;
        case "guard":
        case "block":
          addFlash(ev.x, ev.y, "#5a8ec8", 34, 0.35);
          addFloat(ev.x, ev.y - 18, "BLOCK", "#5a8ec8");
          break;
        case "dodge":
          addFloat(ev.x, ev.y - 18, "DODGE", "#e8dcc0");
          break;
        case "ward":
          addFlash(ev.x, ev.y, "#f0c040", 32, 0.35);
          break;
        case "frost":
          addFlash(ev.x, ev.y, "#7ec8e3", 28, 0.4);
          addFloat(ev.x, ev.y - 16, "SLOW", "#7ec8e3");
          break;
        case "fire_rain":
          addFlash(ev.x, ev.y, "#e67e22", ev.radius || 70, 0.45);
          addShake(3);
          break;
        case "meteor":
          addFlash(ev.x, ev.y, "#e74c3c", ev.radius || 55, 0.4);
          addShake(4);
          if (typeof Particles !== "undefined" && Particles.spawn) {
            Particles.spawn({
              x: ev.x, y: ev.y, vx: 0, vy: 40, life: 0.4, size: 14,
              color: "#e74c3c", gravity: 0, shape: "circle", fade: true
            });
          }
          break;
      }
    } catch (e) {
      console.warn("[Game] event", e);
    }
  }

  function onSnapshotEvents(events) {
    if (!events) return;
    for (var i = 0; i < events.length; i++) processEvent(events[i]);
  }

  function updateFloatingTexts(dt) {
    floatingTexts = floatingTexts.filter(function (t) { return t.life > 0; });
    for (var i = 0; i < floatingTexts.length; i++) {
      floatingTexts[i].life -= dt;
      floatingTexts[i].y += floatingTexts[i].vy * dt;
    }
  }

  function updateFlashes(dt) {
    lightFlashes = lightFlashes.filter(function (f) { return f.life > 0; });
    for (var i = 0; i < lightFlashes.length; i++) lightFlashes[i].life -= dt;
  }

  function drawFloatingTexts(c) {
    if (typeof Camera === "undefined") return;
    for (var i = 0; i < floatingTexts.length; i++) {
      var t = floatingTexts[i];
      var s = Camera.worldToScreen(t.x, t.y);
      c.globalAlpha = Math.max(0, t.life / 0.9);
      c.fillStyle = t.color;
      c.font = "bold 14px VT323, monospace";
      c.textAlign = "center";
      c.fillText(t.text, s.x, s.y);
      c.globalAlpha = 1;
    }
  }

  function drawLightFlashes(c) {
    if (typeof Camera === "undefined") return;
    for (var i = 0; i < lightFlashes.length; i++) {
      var f = lightFlashes[i];
      var s = Camera.worldToScreen(f.x, f.y);
      var a = Math.max(0, f.life / (f.maxLife || 0.35));
      c.globalAlpha = a * 0.55;
      var g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, f.radius);
      g.addColorStop(0, f.color);
      g.addColorStop(1, "transparent");
      c.fillStyle = g;
      c.beginPath();
      c.arc(s.x, s.y, f.radius, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
  }

  function drawProj(c, sx, sy, proj) {
    var col = "#f0e68c";
    if (proj.weaponId === "fire_arrow") col = "#e67e22";
    else if (proj.weaponId === "arcane") col = "#9b59b6";
    else if (proj.team === 0) col = "#7dcea0";
    else if (proj.team === 1) col = "#85c1e9";

    c.save();
    // trail
    c.strokeStyle = col;
    c.globalAlpha = 0.35;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx - (proj.vx || 0) * 0.04, sy - (proj.vy || 0) * 0.04);
    c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = col;
    c.beginPath();
    c.arc(sx, sy, proj.radius || 4, 0, Math.PI * 2);
    c.fill();
    if (proj.weaponId === "fire_arrow") {
      c.fillStyle = "#f39c12";
      c.beginPath();
      c.arc(sx, sy, 2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawNpc(c, sx, sy, npc) {
    c.save();
    c.translate(sx, sy);
    c.rotate(npc.angle || 0);
    var isRam = !!npc.isRam;
    var scale = isRam ? 1.35 : 1;
    var body = npc.color || "#c9a227";
    var r = 10 * scale;
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(0, 0, r * 1.1, r * 0.75, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(r * 0.85, -r * 0.15, r * 0.55, 0, Math.PI * 2);
    c.fill();
    // ears
    c.beginPath();
    c.moveTo(r * 0.55, -r * 0.55);
    c.lineTo(r * 0.7, -r * 1.05);
    c.lineTo(r * 0.95, -r * 0.5);
    c.closePath();
    c.fill();
    c.fillStyle = "#1a120c";
    c.beginPath();
    c.arc(r * 0.95, -r * 0.2, 1.6, 0, Math.PI * 2);
    c.arc(r * 1.2, -r * 0.2, 1.6, 0, Math.PI * 2);
    c.fill();
    c.restore();
    // hp
    if (npc.hp != null && npc.maxHp) {
      var pct = npc.hp / npc.maxHp;
      c.fillStyle = "#222";
      c.fillRect(sx - 12, sy - 20, 24, 3);
      c.fillStyle = pct > 0.35 ? "#3d9e58" : "#d13a35";
      c.fillRect(sx - 12, sy - 20, 24 * pct, 3);
    }
  }

  function loop(ts) {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;
    _frame++;

    updateShake(dt);
    updateFloatingTexts(dt);
    updateFlashes(dt);
    if (typeof Particles !== "undefined" && Particles.update) Particles.update(dt);

    // Feed host
    if (isHost || isSolo) {
      HostSim.setInput(localPlayerId, localInput);
      accumulator += dt;
      while (accumulator >= tickRate) {
        state = HostSim.tick(tickRate) || state;
        accumulator -= tickRate;
      }
      if (state.events && state.events.length) {
        onSnapshotEvents(state.events);
      }
    }

    var localPlayer = getLocalPlayer();
    if (localPlayer && typeof InputManager !== "undefined" && InputManager.setPlayerPos) {
      InputManager.setPlayerPos(localPlayer.x, localPlayer.y);
    }

    // Ability CD UI
    if (localPlayer && typeof AbilityInput !== "undefined" && AbilityInput.setCooldowns) {
      AbilityInput.setCooldowns(localPlayer.skillCd, localPlayer.ultimateCharge);
    }

    // Camera
    if (typeof Camera !== "undefined") {
      if (localPlayer) Camera.follow(localPlayer.x, localPlayer.y);
      else Camera.follow(800, 450);
    }

    var cx = Camera ? Camera.x : 0;
    var cy = Camera ? Camera.y : 0;
    var vw = Camera ? Camera.viewW : canvas.width;
    var vh = Camera ? Camera.viewH : canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(shake.x, shake.y);

    try {
      if (typeof GameMap !== "undefined" && GameMap.draw) {
        GameMap.draw(ctx, cx, cy, vw, vh, { flags: state.flags });
      } else {
        ctx.fillStyle = "#2a4830";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.error("[Game] map", e);
    }

    try {
      // Projectiles
      if (state.projectiles) {
        for (var i = 0; i < state.projectiles.length; i++) {
          var pr = state.projectiles[i];
          var ps = Camera.worldToScreen(pr.x, pr.y);
          drawProj(ctx, ps.x, ps.y, pr);
        }
      }
      // NPCs
      if (state.npcs) {
        for (var n = 0; n < state.npcs.length; n++) {
          var npc = state.npcs[n];
          if (!npc.alive) continue;
          var ns = Camera.worldToScreen(npc.x, npc.y);
          drawNpc(ctx, ns.x, ns.y, npc);
        }
      }
      // Players
      if (state.players) {
        for (var p = 0; p < state.players.length; p++) {
          var pl = state.players[p];
          if (!pl.alive) continue;
          var psc = Camera.worldToScreen(pl.x, pl.y);
          if (typeof drawPlayer === "function") {
            drawPlayer(ctx, psc.x, psc.y, pl, {
              isLocal: pl.id === localPlayerId
            });
          } else {
            ctx.fillStyle = pl.team === 0 ? "#3d9e58" : "#5a8ec8";
            ctx.beginPath();
            ctx.arc(psc.x, psc.y, 14, 0, Math.PI * 2);
            ctx.fill();
          }
          // Guard ring
          if (pl.blockUntil && performance.now() / 1000 < pl.blockUntil) {
            ctx.strokeStyle = "rgba(90,140,200,0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(psc.x, psc.y, 22, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Fury glow
          if (pl.furyUntil && performance.now() / 1000 < pl.furyUntil) {
            ctx.strokeStyle = "rgba(230,100,40,0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(psc.x, psc.y, 20, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      drawLightFlashes(ctx);
      if (typeof Particles !== "undefined" && Particles.draw) {
        Particles.draw(ctx, Camera.worldToScreen);
      }
      drawFloatingTexts(ctx);
    } catch (e2) {
      console.error("[Game] entities", e2);
    }

    ctx.restore();

    try {
      if (typeof HUD !== "undefined" && HUD.draw) {
        HUD.draw(ctx, {
          localPlayer: localPlayer,
          players: state.players,
          npcs: state.npcs,
          flags: state.flags,
          killfeed: state.killfeed,
          timeLeft: state.timeLeft,
          matchOver: state.matchOver,
          winnerName: state.winnerName,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
      }
    } catch (e3) {
      console.error("[Game] HUD", e3);
    }

    // Killfeed grow → shake
    if (state.killfeed && state.killfeed.length > prevKillfeedLen) {
      addShake(3);
    }
    prevKillfeedLen = (state.killfeed && state.killfeed.length) || 0;
  }

  return {
    init: init,
    stop: stop,
    setInput: setInput,
    applySnapshot: function (p) { state = p || state; }
  };
})();
