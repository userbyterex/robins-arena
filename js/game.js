/**
 * game.js — Main game loop with pixel-art rendering.
 */
var Game = (function () {
  var canvas, ctx, running = false, isHost = false, isSolo = false;
  var lastTime = 0, accumulator = 0, tickRate = 20, tickDt = 1 / tickRate;
  var localPlayerId = null;
  var state = { players: [], projectiles: [], npcs: [], flags: [], killfeed: [], matchOver: false, winnerName: null, timeLeft: 0 };
  var localInput = { dx: 0, dy: 0, angle: 0, attack: false, weapon: "sword", ultimate: false };
  var camera = { x: 0, y: 0 };
  var particles = [];
  var _lastSnapshotAt = 0;

  function init(opts) {
    canvas = opts.canvas; ctx = canvas.getContext("2d");
    localPlayerId = opts.localPlayerId;
    isHost = !!opts.isHost;
    isSolo = !!opts.isSolo;
    running = true; lastTime = performance.now() / 1000; accumulator = 0;
    if (isHost || isSolo) { HostSim.init(opts.playerConfigs || []); }
    window.addEventListener("resize", onResize); onResize();
    requestAnimationFrame(loop);
  }

  function onResize() {
    if (!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
  }

  function stop() { running = false; }

  function applySnapshot(payload) {
    if (!payload) return;
    state.players = payload.players || [];
    state.projectiles = payload.projectiles || [];
    state.npcs = payload.npcs || [];
    state.flags = payload.flags || [];
    state.killfeed = payload.killfeed || [];
    state.matchOver = !!payload.matchOver;
    state.winnerName = payload.winnerName || null;
    state.timeLeft = payload.timeLeft || 0;
    if (payload.events) processEvents(payload.events);
    if (payload.serverTime) _lastSnapshotAt = payload.serverTime;
  }

  function processEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.kind === "hit") spawnHitParticles(ev.x, ev.y, 6);
      if (ev.kind === "death") spawnDeathParticles(ev.x, ev.y, 16);
      if (ev.kind === "capture") spawnCaptureParticles(ev.x, ev.y, ev.team);
      if (ev.kind === "spawn") spawnSpawnParticles(ev.x, ev.y, ev.team);
      if (ev.kind === "ultimate") spawnUltimateParticles(ev);
      if (ev.kind === "heal") spawnHealParticles(ev.x, ev.y);
      if (ev.kind === "structure_hit") spawnHitParticles(ev.x, ev.y, 10);
    }
  }

  function spawnHitParticles(x, y, count) {
    for (var i = 0; i < count; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.3 + Math.random() * 0.2, maxLife: 0.5, color: "#e8dcc0", size: 2 + Math.random() * 2 });
    }
  }
  function spawnDeathParticles(x, y, count) {
    for (var i = 0; i < count; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180, life: 0.4 + Math.random() * 0.4, maxLife: 0.8, color: Math.random() > 0.5 ? "#d13a35" : "#e8dcc0", size: 2 + Math.random() * 3 });
    }
  }
  function spawnCaptureParticles(x, y, team) {
    var col = team === 0 ? "#3d9e58" : "#5a8ec8";
    for (var i = 0; i < 20; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.5 + Math.random() * 0.3, maxLife: 0.8, color: col, size: 2 + Math.random() * 3 });
    }
  }
  function spawnSpawnParticles(x, y, team) {
    var col = team === 0 ? "#3d9e58" : "#5a8ec8";
    for (var i = 0; i < 12; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100, life: 0.3 + Math.random() * 0.2, maxLife: 0.5, color: col, size: 2 + Math.random() * 2 });
    }
  }
  function spawnUltimateParticles(ev) {
    var colors = { whirlwind: "#c9a227", arrow_storm: "#7aa2c8", arcane_blast: "#8a2be2", natures_blessing: "#3d9e58" };
    var col = colors[ev.ultimateId] || "#e8dcc0";
    for (var i = 0; i < 24; i++) {
      particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 250, vy: (Math.random() - 0.5) * 250, life: 0.4 + Math.random() * 0.4, maxLife: 0.8, color: col, size: 2 + Math.random() * 4 });
    }
  }
  function spawnHealParticles(x, y) {
    for (var i = 0; i < 10; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 100 - 30, life: 0.4 + Math.random() * 0.3, maxLife: 0.7, color: "#7dcea0", size: 2 + Math.random() * 2 });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles(ctx, cameraX, cameraY) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cameraX - p.size / 2, p.y - cameraY - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function updateCamera(localPlayer, viewW, viewH) {
    if (!localPlayer || !localPlayer.alive) return;
    var targetX = localPlayer.x - viewW / 2;
    var targetY = localPlayer.y - viewH / 2;
    var mapW = GameMap.WIDTH || 1600;
    var mapH = GameMap.HEIGHT || 900;
    targetX = Math.max(0, Math.min(mapW - viewW, targetX));
    targetY = Math.max(0, Math.min(mapH - viewH, targetY));
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
  }

  function drawProjectile(ctx, p, cameraX, cameraY) {
    var weapon = WEAPONS[p.weaponId];
    var color = weapon ? (weapon.projectileColor || "#e8dcc0") : "#e8dcc0";
    ctx.save();
    ctx.translate(p.x - cameraX, p.y - cameraY);
    ctx.rotate(p.angle);
    ctx.fillStyle = color;
    var w = 6, h = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(-w / 2 + 1, -h / 2 + 0.5, w - 2, h - 1);
    ctx.restore();
  }

  function drawNpc(ctx, n, cameraX, cameraY) {
    if (!n.alive) return;
    var sx = n.x - cameraX, sy = n.y - cameraY;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(sx, sy + 10, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = n.color || "#888";
    ctx.beginPath(); ctx.arc(sx, sy, n.isRam ? 10 : 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    var eyeX = sx + Math.cos(n.angle) * 4;
    var eyeY = sy + Math.sin(n.angle) * 4;
    ctx.beginPath(); ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2); ctx.fill();
    var barW = 20, barH = 3;
    ctx.fillStyle = "#0a0c0e";
    ctx.fillRect(sx - barW / 2, sy - 14, barW, barH);
    ctx.fillStyle = n.hp > n.maxHp * 0.4 ? "#3dce5c" : "#d13a35";
    ctx.fillRect(sx - barW / 2, sy - 14, barW * Math.max(0, n.hp / n.maxHp), barH);
    ctx.fillStyle = "#e8dcc0";
    ctx.font = "10px VT323, monospace";
    ctx.textAlign = "center";
    ctx.fillText(n.name || "?", sx, sy - 18);
  }

  function loop() {
    if (!running) return;
    var now = performance.now() / 1000;
    var dt = Math.min(now - lastTime, 0.1);
    lastTime = now;
    accumulator += dt;

    while (accumulator >= tickDt) {
      if (isHost || isSolo) {
        HostSim.setInput(localPlayerId, localInput);
        HostSim.tick(tickDt);
        var snapshot = HostSim.getSnapshotPayload();
        applySnapshot(snapshot);
        if (typeof NetHost !== "undefined" && NetHost.broadcastSnapshot) {
          NetHost.broadcastSnapshot(snapshot);
        }
      }
      accumulator -= tickDt;
    }

    updateParticles(dt);

    var viewW = canvas.width, viewH = canvas.height;
    var localPlayer = state.players.find(function (p) { return p.id === localPlayerId; });
    updateCamera(localPlayer, viewW, viewH);

    ctx.clearRect(0, 0, viewW, viewH);

    if (typeof GameMap !== "undefined" && GameMap.draw) {
      GameMap.draw(ctx, camera.x, camera.y, viewW, viewH, { flags: state.flags });
    }

    // Draw NPCs
    for (var ni = 0; ni < state.npcs.length; ni++) {
      drawNpc(ctx, state.npcs[ni], camera.x, camera.y);
    }

    // Draw projectiles
    for (var pi = 0; pi < state.projectiles.length; pi++) {
      drawProjectile(ctx, state.projectiles[pi], camera.x, camera.y);
    }

    // Draw players
    for (var pl = 0; pl < state.players.length; pl++) {
      var player = state.players[pl];
      if (typeof drawPlayer === "function") {
        drawPlayer(ctx, player.x - camera.x, player.y - camera.y, player);
      }
    }

    drawParticles(ctx, camera.x, camera.y);

    if (typeof HUD !== "undefined" && HUD.draw) {
      HUD.draw(ctx, {
        localPlayer: localPlayer,
        allPlayers: state.players,
        flags: state.flags,
        killfeed: state.killfeed,
        timeLeft: state.timeLeft,
        matchOver: state.matchOver,
        winnerName: state.winnerName,
        viewW: viewW,
        viewH: viewH,
        serverTime: _lastSnapshotAt,
      });
    }

    requestAnimationFrame(loop);
  }

  function setInput(input) { localInput = input; }
  function getLocalPlayer() { return state.players.find(function (p) { return p.id === localPlayerId; }); }

  return { init: init, stop: stop, applySnapshot: applySnapshot, setInput: setInput, getLocalPlayer: getLocalPlayer };
})();
window.Game = Game;
      
