/**
 * game.js — Conquest + classes + ability FX.
 * Classic script (NO import/export).
 */
const Game = (() => {
  var canvas, ctx;
  var isHost = false;
  var myId = null;
  var rafId = null;
  var netIntervalId = null;
  var lastFrameTime = 0;
  var currentWeapon = "sword";
  var running = false;
  var vignetteGradient = null;
  var shakeMag = 0;
  var prevLocalHp = null;

  function buildVignette() {
    var g = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.35,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.75
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    return g;
  }

  function playEventFX(events) {
    if (!events) return;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.kind === "melee" && window.AudioFX) AudioFX.meleeSwing();
      else if (ev.kind === "ranged") {
        if (window.AudioFX) AudioFX.shoot();
        if (window.Particles) Particles.muzzlePuff(ev.x, ev.y);
      } else if (ev.kind === "hit" || ev.kind === "structure_hit") {
        if (window.AudioFX) AudioFX.hit();
        if (window.Particles) Particles.hitSpark(ev.x || 0, ev.y || 0);
      } else if (ev.kind === "death") {
        if (window.AudioFX) AudioFX.death();
        if (window.Particles) Particles.deathBurst(ev.x, ev.y);
      } else if (ev.kind === "ability" || ev.kind === "heal") {
        if (window.AudioFX) AudioFX.hit();
        if (window.Particles) Particles.deathBurst(ev.x, ev.y);
      }
    }
  }

  function drawNpc(ctx, screenX, screenY, npc) {
    ctx.save();
    ctx.translate(screenX, screenY);
    var col = npc.color || (npc.team === 0 ? "#3d9e58" : "#5a8ec8");
    var size = npc.isRam ? 18 : 11;
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.7, size * 0.9, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.rotate(npc.angle || 0);
    if (npc.isRam) {
      ctx.fillStyle = "#4a3720";
      ctx.fillRect(-20, -10, 36, 20);
      ctx.fillStyle = "#8a8a8a";
      ctx.beginPath();
      ctx.moveTo(16, -8); ctx.lineTo(28, 0); ctx.lineTo(16, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(-6, -16, 12, 6);
    } else {
      ctx.fillStyle = col;
      ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
      ctx.fillStyle = "#d4b896";
      ctx.beginPath();
      ctx.arc(0, -size * 1.1, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.font = "11px VT323, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8eef4";
    ctx.fillText(npc.name || "NPC", 0, -size - 15);
    var barW = npc.isRam ? 36 : 24;
    var pct = (npc.hp || 0) / (npc.maxHp || 40);
    ctx.fillStyle = "#0a0c0e";
    ctx.fillRect(-barW / 2, -size - 10, barW, 3);
    ctx.fillStyle = pct > 0.4 ? "#3dce5c" : "#d13a35";
    ctx.fillRect(-barW / 2, -size - 10, barW * Math.max(0, pct), 3);
    ctx.restore();
  }

  function init(payload, hostFlag, localId) {
    isHost = hostFlag;
    myId = localId;
    currentWeapon = "sword";
    shakeMag = 0;
    prevLocalHp = null;
    if (window.Particles) Particles.clear();

    if (isHost) {
      HostSim.init(payload.players);
      Network.onMessage("input", function (msg, fromPeerId) {
        HostSim.setInput(fromPeerId, msg);
      });
      Network.onMessage("peer-left", function (msg) {
        if (msg && msg.peerId) HostSim.markDisconnected(msg.peerId);
      });
    } else {
      ClientSync.init(playEventFX);
    }
  }

  function start(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    Camera.setViewport(canvas.width, canvas.height);
    vignetteGradient = buildVignette();
    Input.init(canvas);
    if (window.TouchControls) TouchControls.init();

    function selectWeapon(w) {
      currentWeapon = w;
      if (window.WeaponBar) WeaponBar.setActive(w);
    }
    if (Input.onWeaponSelect) Input.onWeaponSelect(selectWeapon);
    if (window.WeaponBar) {
      WeaponBar.init(document.getElementById("weapon-bar"), selectWeapon);
      WeaponBar.setActive(currentWeapon);
    }
    if (window.AudioFX) AudioFX.resume();

    running = true;
    lastFrameTime = performance.now();
    netIntervalId = setInterval(networkTick, 1000 / (HostSim.TICK_RATE || 20));
    rafId = requestAnimationFrame(renderLoop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (netIntervalId) clearInterval(netIntervalId);
  }

  function buildLocalInput() {
    var move = Input.getMoveVector ? Input.getMoveVector() : { dx: 0, dy: 0 };
    return {
      type: "input",
      dx: move.dx || 0,
      dy: move.dy || 0,
      angle: Input.getAimAngle ? Input.getAimAngle() : 0,
      attack: Input.isAttacking ? Input.isAttacking() : false,
      weapon: currentWeapon,
      ability: (window.AbilityInput && AbilityInput.consume()) ? true : false,
    };
  }

  function networkTick() {
    var input = buildLocalInput();
    if (isHost) {
      HostSim.setInput(myId, input);
      HostSim.tick(1 / (HostSim.TICK_RATE || 20));
      playEventFX(HostSim.getTickEvents());
      Network.send(HostSim.getSnapshotPayload());
    } else {
      Network.send(input);
    }
  }

  function renderLoop() {
    if (!running) return;
    var now = performance.now();
    var dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    var players, projectiles, npcs, flags, killfeed, timeLeft, matchOver, winnerName, localPlayer, serverTime;

    if (isHost) {
      var state = HostSim.getState();
      players = state.players;
      projectiles = state.projectiles;
      npcs = state.npcs || [];
      flags = state.flags || [];
      killfeed = state.killfeed;
      timeLeft = state.timeLeft;
      matchOver = state.matchOver;
      winnerName = state.winnerName;
      serverTime = performance.now() / 1000;
      localPlayer = players.find(function (p) { return p.id === myId; });
    } else {
      ClientSync.update();
      players = ClientSync.getPlayers();
      projectiles = ClientSync.getProjectiles();
      npcs = ClientSync.getNpcs ? ClientSync.getNpcs() : [];
      flags = ClientSync.getFlags ? ClientSync.getFlags() : [];
      killfeed = ClientSync.getKillfeed();
      timeLeft = ClientSync.getTimeLeft();
      matchOver = ClientSync.isMatchOver();
      winnerName = ClientSync.getWinnerName();
      serverTime = ClientSync.getServerTime ? ClientSync.getServerTime() : performance.now() / 1000;
      localPlayer = players.find(function (p) { return p.id === myId; });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!localPlayer) {
      ctx.fillStyle = "#1a2b1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e8dcc0";
      ctx.font = "20px VT323, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Connecting to camp...", canvas.width / 2, canvas.height / 2);
      rafId = requestAnimationFrame(renderLoop);
      return;
    }

    if (prevLocalHp !== null && localPlayer.hp < prevLocalHp) {
      shakeMag = Math.min(14, shakeMag + (prevLocalHp - localPlayer.hp) * 0.25 + 4);
    }
    prevLocalHp = localPlayer.hp;
    shakeMag *= 0.9;
    var shakeX = shakeMag > 0.3 ? (Math.random() - 0.5) * shakeMag : 0;
    var shakeY = shakeMag > 0.3 ? (Math.random() - 0.5) * shakeMag : 0;

    Camera.follow(localPlayer.x, localPlayer.y);
    if (window.Particles) Particles.update(dt);
    if (window.WeaponBar) WeaponBar.setActive(localPlayer.weapon);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (window.GameMap) GameMap.draw(ctx, Camera.x, Camera.y, Camera.viewW, Camera.viewH, { flags: flags });

    var drawOrder = players.slice().sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < drawOrder.length; i++) {
      var p = drawOrder[i];
      var s = Camera.worldToScreen(p.x, p.y);
      if (typeof drawPlayer === "function") drawPlayer(ctx, s.x, s.y, p);
    }
    for (var ni = 0; ni < npcs.length; ni++) {
      var n = npcs[ni];
      if (!n.alive) continue;
      var ns = Camera.worldToScreen(n.x, n.y);
      drawNpc(ctx, ns.x, ns.y, n);
    }
    for (var pi = 0; pi < projectiles.length; pi++) {
      var proj = projectiles[pi];
      var ps = Camera.worldToScreen(proj.x, proj.y);
      if (typeof drawProjectile === "function") drawProjectile(ctx, ps.x, ps.y, proj);
    }
    if (window.Particles) {
      Particles.draw(ctx, function (wx, wy) { return Camera.worldToScreen(wx, wy); });
    }

    ctx.restore();

    if (vignetteGradient) {
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (window.HUD) {
      HUD.draw(ctx, {
        localPlayer: localPlayer,
        allPlayers: players,
        flags: flags,
        killfeed: killfeed,
        timeLeft: timeLeft,
        matchOver: matchOver,
        winnerName: winnerName,
        viewW: canvas.width,
        viewH: canvas.height,
        serverTime: serverTime,
      });
    }

    rafId = requestAnimationFrame(renderLoop);
  }

  return { init: init, start: start, stop: stop };
})();
