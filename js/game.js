/**
 * game.js — Main game loop with screen shake, damage numbers,
 * kill streaks, smooth camera, muzzle flash, and footstep dust.
 */

var Game = (function () {
  var canvas, ctx, localPlayerId, isHost, isSolo, running = false;
  var lastTime = 0, accumulator = 0, tickRate = 1 / 20;
  var localInput = { dx: 0, dy: 0, angle: 0, attack: false, weapon: "sword", ultimate: false };
  var state = { players: [], projectiles: [], npcs: [], flags: [], killfeed: [], timeLeft: 180, matchOver: false };
  var nextWeaponSwitch = 0;
  var prevInputAttack = false;
  var prevLocalHp = 100;
  var prevAlive = true;
  var lastStepPos = { x: 0, y: 0 };
  var smoothCam = { x: 0, y: 0 };

  var shake = { x: 0, y: 0, intensity: 0, decay: 18 };
  var floatingTexts = [];
  var streak = { count: 0, lastKillAt: 0 };
  var prevKillfeedLen = 0;
  var damageFlashEl = null;

  function init(opts) {
    canvas = opts.canvas;
    ctx = canvas.getContext("2d");
    localPlayerId = opts.localPlayerId;
    isHost = opts.isHost;
    isSolo = opts.isSolo;
    damageFlashEl = document.getElementById("damage-flash");

    Camera.setViewport(canvas.width, canvas.height);
    HostSim.init(opts.playerConfigs || []);

    if (!isSolo && !isHost) {
      ClientSync.init(onSnapshotEvents);
    }

    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function stop() { running = false; }

  function applySnapshot(payload) { state = payload; }

  function setInput(input) { localInput = input || localInput; }

  function getLocalPlayer() {
    return state.players.find(function (p) { return p.id === localPlayerId; });
  }

  function onSnapshotEvents(events) {
    if (!events) return;
    for (var i = 0; i < events.length; i++) { processEvent(events[i]); }
  }

  function processEvent(ev) {
    if (!ev || !ev.kind) return;
    switch (ev.kind) {
      case "hit":
        Particles.hitSpark(ev.x, ev.y);
        addShake(1.5);
        break;
      case "death":
        Particles.deathBurst(ev.x, ev.y);
        addShake(4);
        break;
      case "ultimate":
        addShake(6);
        Particles.spawn({ x: ev.x, y: ev.y, vx: 0, vy: -40, life: 0.7, size: 18, color: "#c9a227", gravity: 0, shape: "circle", fade: true });
        break;
      case "heal":
        Particles.spawn({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 20, vy: -25, life: 0.5, size: 3, color: "#3d9e58", gravity: -15, shape: "circle" });
        break;
      case "tower_shot":
        addShake(1);
        break;
      case "capture":
        addShake(3);
        break;
    }
  }

  function addShake(amount) { shake.intensity = Math.min(shake.intensity + amount, 16); }

  function updateShake(dt) {
    if (shake.intensity > 0.1) {
      shake.x = (Math.random() - 0.5) * shake.intensity * 2;
      shake.y = (Math.random() - 0.5) * shake.intensity * 2;
      shake.intensity -= shake.decay * dt;
    } else {
      shake.intensity = 0; shake.x = 0; shake.y = 0;
    }
  }

  function addFloatingText(x, y, text, color, isCrit) {
    floatingTexts.push({ x: x, y: y, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -45, isCrit: !!isCrit });
  }

  function updateFloatingTexts(dt) {
    floatingTexts = floatingTexts.filter(function (t) { return t.life > 0; });
    for (var i = 0; i < floatingTexts.length; i++) {
      var t = floatingTexts[i];
      t.life -= dt;
      t.y += t.vy * dt;
    }
  }

  function drawFloatingTexts(ctx) {
    for (var i = 0; i < floatingTexts.length; i++) {
      var t = floatingTexts[i];
      var s = Camera.worldToScreen(t.x, t.y);
      var alpha = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.font = (t.isCrit ? "bold 20px " : "bold 15px ") + "'VT323', monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, s.x, s.y);
      ctx.fillText(t.text, s.x, s.y);
      ctx.restore();
    }
  }

  function onLocalKill() {
    var now = performance.now() / 1000;
    if (now - streak.lastKillAt < 5) { streak.count++; }
    else { streak.count = 1; }
    streak.lastKillAt = now;
    if (streak.count >= 2) { showStreakBanner(streak.count); }
  }

  function showStreakBanner(count) {
    var banner = document.getElementById("kill-streak-banner");
    var text = document.getElementById("kill-streak-text");
    if (!banner || !text) return;
    var labels = {
      2: "🔥 DOUBLE KILL", 3: "🔥🔥 TRIPLE KILL", 4: "🔥🔥🔥 QUADRA KILL",
      5: "🔥🔥🔥🔥 RAMPAGE!", 6: "🔥🔥🔥🔥🔥 UNSTOPPABLE!", 7: "🔥🔥🔥🔥🔥🔥 LEGENDARY!"
    };
    text.textContent = labels[count] || ("🔥 KILL STREAK x" + count);
    banner.classList.remove("hidden");
    banner.style.animation = "none";
    banner.offsetHeight;
    banner.style.animation = "";
    setTimeout(function () { banner.classList.add("hidden"); }, 2500);
  }

  function checkFootsteps(player) {
    if (!player || !player.alive) return;
    var dist = Math.hypot(player.x - lastStepPos.x, player.y - lastStepPos.y);
    if (dist > 30) {
      Particles.dust(player.x, player.y + 10, "rgba(232,220,192,0.18)");
      lastStepPos.x = player.x;
      lastStepPos.y = player.y;
    }
  }

  function checkMuzzleFlash(player) {
    if (!player) return;
    var w = WEAPONS[player.weapon];
    if (w && !w.isMelee && localInput.attack && !prevInputAttack) {
      var mx = player.x + Math.cos(player.angle) * (PLAYER_RADIUS + 8);
      var my = player.y + Math.sin(player.angle) * (PLAYER_RADIUS + 8);
      Particles.muzzlePuff(mx, my);
      flashLight(mx, my, 50, "rgba(255,230,150,0.12)");
    }
  }

  var lightFlashes = [];
  function flashLight(x, y, radius, color) {
    lightFlashes.push({ x: x, y: y, radius: radius, color: color, life: 0.12, maxLife: 0.12 });
  }

  function updateLightFlashes(dt) {
    lightFlashes = lightFlashes.filter(function (f) { return f.life > 0; });
    for (var i = 0; i < lightFlashes.length; i++) { lightFlashes[i].life -= dt; }
  }

  function drawLightFlashes(ctx) {
    for (var i = 0; i < lightFlashes.length; i++) {
      var f = lightFlashes[i];
      var s = Camera.worldToScreen(f.x, f.y);
      var alpha = Math.max(0, f.life / f.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, f.radius);
      g.addColorStop(0, f.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function checkLocalDamage(localPlayer, allEntities) {
    if (!localPlayer) return;
    if (localPlayer.hp < prevLocalHp && localPlayer.alive) {
      var dmg = prevLocalHp - localPlayer.hp;
      if (damageFlashEl) {
        damageFlashEl.classList.add("active");
        setTimeout(function () { if (damageFlashEl) damageFlashEl.classList.remove("active"); }, 120);
      }
      addShake(2 + dmg * 0.1);
      AudioFX.hit();
    }
    if (!localPlayer.alive && prevAlive) {
      addShake(8);
      streak.count = 0;
      AudioFX.death();
    }
    if (localPlayer.alive && !prevAlive) {
      if (damageFlashEl) {
        damageFlashEl.style.boxShadow = "inset 0 0 80px rgba(61,158,88,0.3)";
        setTimeout(function () { if (damageFlashEl) damageFlashEl.style.boxShadow = ""; }, 300);
      }
    }
    prevLocalHp = localPlayer.hp;
    prevAlive = localPlayer.alive;
  }

  function checkKillfeed(localPlayer) {
    if (!localPlayer || !state.killfeed) return;
    var kf = state.killfeed;
    for (var i = prevKillfeedLen; i < kf.length; i++) {
      var k = kf[i];
      if (k.killerName === localPlayer.name) {
        onLocalKill();
        AudioFX.beep({ freq: 700, duration: 0.18, type: "sawtooth", volume: 0.12 });
      }
    }
    prevKillfeedLen = kf.length;
  }

  function loop(timestamp) {
    if (!running) return;
    var dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    accumulator += dt;
    while (accumulator >= tickRate) {
      accumulator -= tickRate;
      if (isHost || isSolo) {
        HostSim.setInput(localPlayerId, localInput);
        HostSim.tick(tickRate);
        var snapshot = HostSim.getSnapshotPayload();
        state = snapshot;
        if (snapshot.events) {
          for (var e = 0; e < snapshot.events.length; e++) { processEvent(snapshot.events[e]); }
        }
        if (!isSolo) {
          if (typeof Network !== "undefined" && Network.send) {
            Network.send({ type: "snapshot", data: snapshot });
          }
        }
      } else {
        if (typeof Network !== "undefined" && Network.send) {
          Network.send({ type: "input", input: localInput });
        }
      }
    }

    if (!isHost && !isSolo) {
      ClientSync.update();
      state.players = ClientSync.getPlayers();
      state.projectiles = ClientSync.getProjectiles();
      state.npcs = ClientSync.getNpcs();
      state.flags = ClientSync.getFlags();
      state.killfeed = ClientSync.getKillfeed();
      state.timeLeft = ClientSync.getTimeLeft();
      state.matchOver = ClientSync.isMatchOver();
    }

    Particles.update(dt);
    updateShake(dt);
    updateFloatingTexts(dt);
    updateLightFlashes(dt);

    var localPlayer = getLocalPlayer();
    var allEntities = (state.players || []).concat(state.npcs || []);
    checkLocalDamage(localPlayer, allEntities);
    checkKillfeed(localPlayer);
    checkFootsteps(localPlayer);
    checkMuzzleFlash(localPlayer);
    prevInputAttack = localInput.attack;

    if (typeof InputManager !== "undefined" && InputManager.setPlayerPos && localPlayer) {
      InputManager.setPlayerPos(localPlayer.x, localPlayer.y);
    }
  }

  function render() {
    if (!canvas || !ctx) return;

    // Always paint a visible ground (never pure empty CSS green)
    ctx.fillStyle = "#2d4a30";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var localPlayer = getLocalPlayer();

    // If no local player yet, center near camp spawn
    if (localPlayer && localPlayer.alive) {
      var targetX = localPlayer.x - Camera.viewW / 2;
      var targetY = localPlayer.y - Camera.viewH / 2;
      smoothCam.x += (targetX - smoothCam.x) * 0.12;
      smoothCam.y += (targetY - smoothCam.y) * 0.12;
      Camera.follow(smoothCam.x + Camera.viewW / 2, smoothCam.y + Camera.viewH / 2);
    } else if (localPlayer) {
      Camera.follow(localPlayer.x, localPlayer.y);
    } else {
      Camera.follow(400, 500);
    }

    var cx = Camera.x;
    var cy = Camera.y;
    var vw = Camera.viewW;
    var vh = Camera.viewH;

    ctx.save();
    ctx.translate(shake.x || 0, shake.y || 0);

    try {
      if (typeof GameMap !== "undefined" && typeof GameMap.draw === "function") {
        GameMap.draw(ctx, cx, cy, vw, vh, { flags: state.flags });
      } else {
        // Fallback grid so we never see blank green
        ctx.fillStyle = "#355c3a";
        ctx.fillRect(0, 0, vw, vh);
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        for (var gx = -((cx % 64)); gx < vw; gx += 64) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, vh); ctx.stroke();
        }
        for (var gy = -((cy % 64)); gy < vh; gy += 64) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(vw, gy); ctx.stroke();
        }
        ctx.fillStyle = "#e8dcc0";
        ctx.font = "16px monospace";
        ctx.fillText("MAP MISSING — check js/engine/map.js", 20, 40);
      }
    } catch (err) {
      console.error("Map draw error:", err);
      ctx.fillStyle = "#c0392b";
      ctx.font = "14px monospace";
      ctx.fillText("Map error: " + (err && err.message ? err.message : err), 20, 40);
    }

    try {
      if (state.projectiles) {
        for (var i = 0; i < state.projectiles.length; i++) {
          var proj = state.projectiles[i];
          var ps = Camera.worldToScreen(proj.x, proj.y);
          if (typeof drawProjectile === "function") drawProjectile(ctx, ps.x, ps.y, proj);
        }
      }

      if (state.npcs) {
        for (var n = 0; n < state.npcs.length; n++) {
          var npc = state.npcs[n];
          if (!npc.alive) continue;
          var ns = Camera.worldToScreen(npc.x, npc.y);
          drawNpc(ctx, ns.x, ns.y, npc);
        }
      }

      if (state.players) {
        for (var p = 0; p < state.players.length; p++) {
          var pl = state.players[p];
          if (!pl.alive) continue;
          var ps2 = Camera.worldToScreen(pl.x, pl.y);
          if (typeof drawPlayer === "function") drawPlayer(ctx, ps2.x, ps2.y, pl);
        }
      }

      drawLightFlashes(ctx);
      if (typeof Particles !== "undefined" && Particles.draw) {
        Particles.draw(ctx, Camera.worldToScreen);
      }
      drawFloatingTexts(ctx);
    } catch (err2) {
      console.error("Entity draw error:", err2);
    }

    ctx.restore();

    try {
      if (typeof HUD !== "undefined" && HUD.draw) {
        HUD.draw(ctx, {
          localPlayer: localPlayer,
          players: state.players,
          npcs: state.npcs,
          killfeed: state.killfeed,
          timeLeft: state.timeLeft,
          matchOver: state.matchOver,
          winnerName: state.winnerName,
          camera: Camera,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
      }
    } catch (err3) {
      console.error("HUD error:", err3);
    }
  }

  function drawNpc(ctx, sx, sy, npc) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(npc.angle);
    ctx.fillStyle = npc.color || "#888";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    if (npc.hp < npc.maxHp) {
      var pct = npc.hp / npc.maxHp;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-12, -18, 24, 4);
      ctx.fillStyle = pct > 0.4 ? "#3d9e58" : "#d13a35";
      ctx.fillRect(-12, -18, 24 * pct, 4);
    }
    ctx.restore();
  }

  return {
    init: init,
    stop: stop,
    applySnapshot: applySnapshot,
    setInput: setInput,
    getLocalPlayer: getLocalPlayer
  };
})();
