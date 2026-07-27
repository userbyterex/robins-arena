/**
 * game.js — Defensive conquest render (never blank green).
 * Classic script, no import/export.
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
  var lastError = null;

  function buildVignette() {
    if (!ctx || !canvas) return null;
    var g = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.35,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.75
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    return g;
  }

  function playEventFX(events) {
    if (!events || !events.length) return;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      try {
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
        } else if (ev.kind === "ability" || ev.kind === "heal" || ev.kind === "capture" || ev.kind === "spawn") {
          if (window.AudioFX) AudioFX.hit();
          if (window.Particles && ev.x != null) Particles.hitSpark(ev.x, ev.y);
        }
      } catch (e) {}
    }
  }

  function drawNpc(ctx2, screenX, screenY, npc) {
    ctx2.save();
    ctx2.translate(screenX, screenY);
    var col = npc.color || (npc.team === 0 ? "#3d9e58" : "#5a8ec8");
    var size = npc.isRam ? 18 : 11;
    ctx2.fillStyle = "rgba(0,0,0,0.32)";
    ctx2.beginPath();
    ctx2.ellipse(0, size * 0.7, size * 0.9, size * 0.35, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.save();
    ctx2.rotate(npc.angle || 0);
    if (npc.isRam) {
      ctx2.fillStyle = "#4a3720";
      ctx2.fillRect(-20, -10, 36, 20);
      ctx2.fillStyle = "#8a8a8a";
      ctx2.beginPath();
      ctx2.moveTo(16, -8); ctx2.lineTo(28, 0); ctx2.lineTo(16, 8); ctx2.closePath();
      ctx2.fill();
      ctx2.fillStyle = col;
      ctx2.fillRect(-6, -16, 12, 6);
    } else {
      ctx2.fillStyle = col;
      ctx2.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
      ctx2.fillStyle = "#d4b896";
      ctx2.beginPath();
      ctx2.arc(0, -size * 1.1, size * 0.45, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.restore();
    ctx2.font = "11px monospace";
    ctx2.textAlign = "center";
    ctx2.fillStyle = "#e8eef4";
    ctx2.fillText(npc.name || "NPC", 0, -size - 15);
    var barW = npc.isRam ? 36 : 24;
    var pct = (npc.hp || 0) / (npc.maxHp || 40);
    ctx2.fillStyle = "#0a0c0e";
    ctx2.fillRect(-barW / 2, -size - 10, barW, 3);
    ctx2.fillStyle = pct > 0.4 ? "#3dce5c" : "#d13a35";
    ctx2.fillRect(-barW / 2, -size - 10, barW * Math.max(0, pct), 3);
    ctx2.restore();
  }

  function init(payload, hostFlag, localId) {
    isHost = !!hostFlag;
    myId = localId;
    currentWeapon = "sword";
    shakeMag = 0;
    prevLocalHp = null;
    lastError = null;

    if (window.Particles && Particles.clear) {
      try { Particles.clear(); } catch (e) {}
    }

    var players = (payload && payload.players) ? payload.players : [];
    if (!myId && players.length) myId = players[0].id;

    if (isHost) {
      if (typeof HostSim === "undefined") {
        lastError = "HostSim missing";
        console.error(lastError);
        return;
      }
      HostSim.init(players);
      if (typeof Network !== "undefined") {
        Network.onMessage("input", function (msg, fromPeerId) {
          HostSim.setInput(fromPeerId, msg);
        });
        Network.onMessage("peer-left", function (msg) {
          if (msg && msg.peerId) HostSim.markDisconnected(msg.peerId);
        });
      }
    } else if (typeof ClientSync !== "undefined") {
      ClientSync.init(playEventFX);
    }
  }

  function start(canvasEl) {
    canvas = canvasEl;
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (window.Camera && Camera.setViewport) Camera.setViewport(canvas.width, canvas.height);
    vignetteGradient = buildVignette();
    if (window.Input && Input.init) Input.init(canvas);
    if (window.TouchControls && TouchControls.init) {
      try { TouchControls.init(); } catch (e) {}
    }
    function selectWeapon(w) {
      currentWeapon = w;
      if (window.WeaponBar && WeaponBar.setActive) WeaponBar.setActive(w);
    }
    if (window.Input && Input.onWeaponSelect) Input.onWeaponSelect(selectWeapon);
    if (window.WeaponBar && WeaponBar.init) {
      try {
        WeaponBar.init(document.getElementById("weapon-bar"), selectWeapon);
        WeaponBar.setActive(currentWeapon);
      } catch (e) {}
    }
    if (window.AudioFX && AudioFX.resume) {
      try { AudioFX.resume(); } catch (e) {}
    }
    running = true;
    lastFrameTime = performance.now();
    var tickRate = (window.HostSim && HostSim.TICK_RATE) ? HostSim.TICK_RATE : 20;
    netIntervalId = setInterval(networkTick, 1000 / tickRate);
    rafId = requestAnimationFrame(renderLoop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (netIntervalId) clearInterval(netIntervalId);
  }

  function buildLocalInput() {
    var move = { dx: 0, dy: 0 };
    if (window.Input && Input.getMoveVector) move = Input.getMoveVector();
    return {
      type: "input",
      dx: move.dx || 0,
      dy: move.dy || 0,
      angle: (window.Input && Input.getAimAngle) ? Input.getAimAngle() : 0,
      attack: (window.Input && Input.isAttacking) ? Input.isAttacking() : false,
      weapon: currentWeapon,
      ability: (window.AbilityInput && AbilityInput.consume()) ? true : false,
    };
  }

  function networkTick() {
    try {
      var input = buildLocalInput();
      if (isHost && window.HostSim) {
        HostSim.setInput(myId, input);
        HostSim.tick(1 / (HostSim.TICK_RATE || 20));
        playEventFX(HostSim.getTickEvents());
        if (typeof Network !== "undefined") Network.send(HostSim.getSnapshotPayload());
      } else if (typeof Network !== "undefined") {
        Network.send(input);
      }
    } catch (e) {
      lastError = e.message || String(e);
      console.error("networkTick", e);
    }
  }

  function renderLoop() {
    if (!running || !ctx || !canvas) return;
    var now = performance.now();
    var dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    try {
      var players = [];
      var projectiles = [];
      var npcs = [];
      var flags = [];
      var killfeed = [];
      var timeLeft = 0;
      var matchOver = false;
      var winnerName = null;
      var localPlayer = null;
      var serverTime = now / 1000;

      if (isHost && window.HostSim) {
        var state = HostSim.getState();
        players = state.players || [];
        projectiles = state.projectiles || [];
        npcs = state.npcs || [];
        flags = state.flags || [];
        killfeed = state.killfeed || [];
        timeLeft = state.timeLeft || 0;
        matchOver = !!state.matchOver;
        winnerName = state.winnerName;
        for (var i = 0; i < players.length; i++) {
          if (players[i].id === myId) { localPlayer = players[i]; break; }
        }
        if (!localPlayer && players.length) localPlayer = players[0];
      } else if (window.ClientSync) {
        ClientSync.update();
        players = ClientSync.getPlayers() || [];
        projectiles = ClientSync.getProjectiles() || [];
        npcs = ClientSync.getNpcs ? ClientSync.getNpcs() : [];
        flags = ClientSync.getFlags ? ClientSync.getFlags() : [];
        killfeed = ClientSync.getKillfeed() || [];
        timeLeft = ClientSync.getTimeLeft() || 0;
        matchOver = ClientSync.isMatchOver();
        winnerName = ClientSync.getWinnerName();
        for (var j = 0; j < players.length; j++) {
          if (players[j].id === myId) { localPlayer = players[j]; break; }
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1a2b1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!localPlayer) {
        ctx.fillStyle = "#e8dcc0";
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Connecting to camp...", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "14px monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText("myId: " + String(myId) + "  players: " + players.length, canvas.width / 2, canvas.height / 2 + 20);
        if (lastError) {
          ctx.fillStyle = "#ff6666";
          ctx.fillText(lastError, canvas.width / 2, canvas.height / 2 + 44);
        }
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

      if (window.Camera && Camera.follow) Camera.follow(localPlayer.x, localPlayer.y);
      if (window.Particles && Particles.update) {
        try { Particles.update(dt); } catch (e) {}
      }
      if (window.WeaponBar && WeaponBar.setActive) WeaponBar.setActive(localPlayer.weapon || currentWeapon);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      if (window.GameMap && GameMap.draw && window.Camera) {
        try {
          GameMap.draw(ctx, Camera.x, Camera.y, Camera.viewW || canvas.width, Camera.viewH || canvas.height, { flags: flags });
        } catch (e) {
          lastError = "Map: " + (e.message || e);
        }
      }

      if (typeof drawPlayer === "function" && window.Camera) {
        var drawOrder = players.slice().sort(function (a, b) { return a.y - b.y; });
        for (var pi = 0; pi < drawOrder.length; pi++) {
          var p = drawOrder[pi];
          var s = Camera.worldToScreen(p.x, p.y);
          try { drawPlayer(ctx, s.x, s.y, p); } catch (e) {}
        }
      }

      if (window.Camera) {
        for (var ni = 0; ni < npcs.length; ni++) {
          var n = npcs[ni];
          if (!n.alive) continue;
          var ns = Camera.worldToScreen(n.x, n.y);
          try { drawNpc(ctx, ns.x, ns.y, n); } catch (e) {}
        }
      }

      if (typeof drawProjectile === "function" && window.Camera) {
        for (var qi = 0; qi < projectiles.length; qi++) {
          var proj = projectiles[qi];
          var ps = Camera.worldToScreen(proj.x, proj.y);
          try { drawProjectile(ctx, ps.x, ps.y, proj); } catch (e) {}
        }
      }

      if (window.Particles && Particles.draw && window.Camera) {
        try {
          Particles.draw(ctx, function (wx, wy) { return Camera.worldToScreen(wx, wy); });
        } catch (e) {}
      }

      ctx.restore();

      if (vignetteGradient) {
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (window.HUD && HUD.draw) {
        try {
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
        } catch (e) {
          lastError = "HUD: " + (e.message || e);
        }
      } else {
        ctx.fillStyle = "#e8eef4";
        ctx.font = "16px monospace";
        ctx.textAlign = "left";
        ctx.fillText("HP " + Math.round(localPlayer.hp || 0), 16, 28);
        ctx.fillText((localPlayer.name || "?") + " team " + localPlayer.team, 16, 48);
      }
    } catch (e) {
      lastError = e.message || String(e);
      console.error("renderLoop", e);
      ctx.fillStyle = "#1a2b1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff6666";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Error: " + lastError, canvas.width / 2, canvas.height / 2);
    }

    rafId = requestAnimationFrame(renderLoop);
  }

  return { init: init, start: start, stop: stop };
})();
