/**
 * game.js — FIXED: single drawNpc, safe render, Game always exported.
 */
var Game = (function () {
  console.log("[Game] loading…");

  var canvas, ctx, localPlayerId, isHost, isSolo, running = false;
  var lastTime = 0, accumulator = 0, tickRate = 1 / 20;
  var localInput = { dx: 0, dy: 0, angle: 0, attack: false, weapon: "sword", ultimate: false };
  var state = { players: [], projectiles: [], npcs: [], flags: [], killfeed: [], timeLeft: 180, matchOver: false };
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
  var lightFlashes = [];
  var _frame = 0;

  function init(opts) {
    console.log("[Game] init", {
      isHost: opts && opts.isHost,
      isSolo: opts && opts.isSolo,
      localId: opts && opts.localPlayerId,
      configs: (opts && opts.playerConfigs && opts.playerConfigs.length) || 0
    });

    canvas = opts.canvas;
    if (!canvas) {
      console.error("[Game] no canvas");
      return;
    }
    canvas.width = window.innerWidth || 960;
    canvas.height = window.innerHeight || 640;
    ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[Game] no 2d context");
      return;
    }

    localPlayerId = opts.localPlayerId;
    isHost = !!opts.isHost;
    isSolo = !!opts.isSolo;
    damageFlashEl = document.getElementById("damage-flash");

    if (typeof Camera !== "undefined" && Camera.setViewport) {
      Camera.setViewport(canvas.width, canvas.height);
    }

    if (typeof HostSim === "undefined" || !HostSim.init) {
      console.error("[Game] HostSim missing");
      return;
    }
    HostSim.init(opts.playerConfigs || []);

    if (!isSolo && !isHost && typeof ClientSync !== "undefined" && ClientSync.init) {
      ClientSync.init(onSnapshotEvents);
    }

    smoothCam.x = 0;
    smoothCam.y = 200;
    if (typeof Camera !== "undefined" && Camera.follow) {
      Camera.follow(400, 450);
    }

    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
    console.log("[Game] loop started", canvas.width + "x" + canvas.height);
  }

  function stop() {
    running = false;
    console.log("[Game] stopped");
  }

  function applySnapshot(payload) { state = payload || state; }

  function setInput(input) { localInput = input || localInput; }

  function getLocalPlayer() {
    if (!state.players) return null;
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === localPlayerId) return state.players[i];
    }
    return null;
  }

  function onSnapshotEvents(events) {
    if (!events) return;
    for (var i = 0; i < events.length; i++) processEvent(events[i]);
  }

  function processEvent(ev) {
    if (!ev || !ev.kind) return;
    try {
      switch (ev.kind) {
        case "hit":
          if (typeof Particles !== "undefined" && Particles.hitSpark) Particles.hitSpark(ev.x, ev.y);
          addShake(1.5);
          break;
        case "death":
          if (typeof Particles !== "undefined" && Particles.deathBurst) Particles.deathBurst(ev.x, ev.y);
          addShake(4);
          break;
        case "ultimate":
          addShake(6);
          if (typeof Particles !== "undefined" && Particles.spawn) {
            Particles.spawn({
              x: ev.x, y: ev.y, vx: 0, vy: -40, life: 0.7, size: 18,
              color: "#c9a227", gravity: 0, shape: "circle", fade: true
            });
          }
          break;
        case "heal":
          if (typeof Particles !== "undefined" && Particles.spawn) {
            Particles.spawn({
              x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 20, vy: -25,
              life: 0.5, size: 3, color: "#3d9e58", gravity: -15, shape: "circle"
            });
          }
          break;
        case "tower_shot":
          addShake(1);
          break;
        case "capture":
          addShake(3);
          break;
      }
    } catch (e) {
      console.warn("[Game] processEvent", e);
    }
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

  function updateFloatingTexts(dt) {
    floatingTexts = floatingTexts.filter(function (t) { return t.life > 0; });
    for (var i = 0; i < floatingTexts.length; i++) {
      floatingTexts[i].life -= dt;
      floatingTexts[i].y += floatingTexts[i].vy * dt;
    }
  }

  function drawFloatingTexts(c) {
    for (var i = 0; i < floatingTexts.length; i++) {
      var t = floatingTexts[i];
      var s = Camera.worldToScreen(t.x, t.y);
      var alpha = Math.max(0, t.life / t.maxLife);
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = t.color;
      c.font = (t.isCrit ? "bold 20px " : "bold 15px ") + "'VT323', monospace";
      c.textAlign = "center";
      c.strokeStyle = "rgba(0,0,0,0.6)";
      c.lineWidth = 3;
      c.strokeText(t.text, s.x, s.y);
      c.fillText(t.text, s.x, s.y);
      c.restore();
    }
  }

  function onLocalKill() {
    var now = performance.now() / 1000;
    if (now - streak.lastKillAt < 5) streak.count++;
    else streak.count = 1;
    streak.lastKillAt = now;
    if (streak.count >= 2) showStreakBanner(streak.count);
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
    setTimeout(function () { banner.classList.add("hidden"); }, 2500);
  }

  function checkFootsteps(player) {
    if (!player || !player.alive) return;
    var dist = Math.hypot(player.x - lastStepPos.x, player.y - lastStepPos.y);
    if (dist > 30) {
      if (typeof Particles !== "undefined" && Particles.dust) {
        Particles.dust(player.x, player.y + 10, "rgba(232,220,192,0.18)");
      }
      lastStepPos.x = player.x;
      lastStepPos.y = player.y;
    }
  }

  function checkMuzzleFlash(player) {
    if (!player || typeof WEAPONS === "undefined") return;
    var w = WEAPONS[player.weapon];
    if (w && !w.isMelee && localInput.attack && !prevInputAttack) {
      var mx = player.x + Math.cos(player.angle) * 22;
      var my = player.y + Math.sin(player.angle) * 22;
      if (typeof Particles !== "undefined" && Particles.muzzlePuff) Particles.muzzlePuff(mx, my);
      flashLight(mx, my, 50, "rgba(255,230,150,0.12)");
    }
  }

  function flashLight(x, y, radius, color) {
    lightFlashes.push({ x: x, y: y, radius: radius, color: color, life: 0.12, maxLife: 0.12 });
  }

  function updateLightFlashes(dt) {
    lightFlashes = lightFlashes.filter(function (f) { return f.life > 0; });
    for (var i = 0; i < lightFlashes.length; i++) lightFlashes[i].life -= dt;
  }

  function drawLightFlashes(c) {
    for (var i = 0; i < lightFlashes.length; i++) {
      var f = lightFlashes[i];
      var s = Camera.worldToScreen(f.x, f.y);
      var alpha = Math.max(0, f.life / f.maxLife);
      c.save();
      c.globalAlpha = alpha;
      var g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, f.radius);
      g.addColorStop(0, f.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(s.x, s.y, f.radius, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  function checkLocalDamage(localPlayer) {
    if (!localPlayer) return;
    if (localPlayer.hp < prevLocalHp && localPlayer.alive) {
      var dmg = prevLocalHp - localPlayer.hp;
      if (damageFlashEl) {
        damageFlashEl.classList.add("active");
        setTimeout(function () {
          if (damageFlashEl) damageFlashEl.classList.remove("active");
        }, 120);
      }
      addShake(2 + dmg * 0.1);
      if (typeof AudioFX !== "undefined" && AudioFX.hit) AudioFX.hit();
    }
    if (!localPlayer.alive && prevAlive) {
      addShake(8);
      streak.count = 0;
      if (typeof AudioFX !== "undefined" && AudioFX.death) AudioFX.death();
    }
    prevLocalHp = localPlayer.hp;
    prevAlive = localPlayer.alive;
  }

  function checkKillfeed(localPlayer) {
    if (!localPlayer || !state.killfeed) return;
    var kf = state.killfeed;
    for (var i = prevKillfeedLen; i < kf.length; i++) {
      if (kf[i].killerName === localPlayer.name) {
        onLocalKill();
        if (typeof AudioFX !== "undefined" && AudioFX.beep) {
          AudioFX.beep({ freq: 700, duration: 0.18, type: "sawtooth", volume: 0.12 });
        }
      }
    }
    prevKillfeedLen = kf.length;
  }

  function loop(timestamp) {
    if (!running) return;
    var dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    try {
      update(dt);
      render();
    } catch (err) {
      console.error("[Game] frame error", err);
    }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    accumulator += dt;
    while (accumulator >= tickRate) {
      accumulator -= tickRate;
      if (isHost || isSolo) {
        if (typeof HostSim !== "undefined") {
          HostSim.setInput(localPlayerId, localInput);
          HostSim.tick(tickRate);
          var snapshot = HostSim.getSnapshotPayload();
          state = snapshot;
          if (snapshot.events) {
            for (var e = 0; e < snapshot.events.length; e++) processEvent(snapshot.events[e]);
          }
          if (!isSolo && typeof Network !== "undefined" && Network.send) {
            Network.send({ type: "snapshot", data: snapshot });
          }
        }
      } else if (typeof Network !== "undefined" && Network.send) {
        Network.send({ type: "input", input: localInput });
      }
    }

    if (!isHost && !isSolo && typeof ClientSync !== "undefined") {
      ClientSync.update();
      state.players = ClientSync.getPlayers();
      state.projectiles = ClientSync.getProjectiles();
      state.npcs = ClientSync.getNpcs();
      state.flags = ClientSync.getFlags();
      state.killfeed = ClientSync.getKillfeed();
      state.timeLeft = ClientSync.getTimeLeft();
      state.matchOver = ClientSync.isMatchOver();
    }

    if (typeof Particles !== "undefined" && Particles.update) Particles.update(dt);
    updateShake(dt);
    updateFloatingTexts(dt);
    updateLightFlashes(dt);

    var localPlayer = getLocalPlayer();
    checkLocalDamage(localPlayer);
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
    _frame++;

    var iw = window.innerWidth || canvas.width;
    var ih = window.innerHeight || canvas.height;
    if (canvas.width !== iw || canvas.height !== ih) {
      canvas.width = iw;
      canvas.height = ih;
      if (typeof Camera !== "undefined" && Camera.setViewport) {
        Camera.setViewport(iw, ih);
      }
    }

    ctx.fillStyle = "#2d4a30";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var localPlayer = getLocalPlayer();

    if (typeof Camera !== "undefined") {
      if (localPlayer && localPlayer.alive) {
        var targetX = localPlayer.x - Camera.viewW / 2;
        var targetY = localPlayer.y - Camera.viewH / 2;
        smoothCam.x += (targetX - smoothCam.x) * 0.12;
        smoothCam.y += (targetY - smoothCam.y) * 0.12;
        Camera.follow(smoothCam.x + Camera.viewW / 2, smoothCam.y + Camera.viewH / 2);
      } else if (localPlayer) {
        Camera.follow(localPlayer.x, localPlayer.y);
      } else {
        Camera.follow(400, 450);
      }
    }

    var cx = (typeof Camera !== "undefined") ? Camera.x : 0;
    var cy = (typeof Camera !== "undefined") ? Camera.y : 0;
    var vw = (typeof Camera !== "undefined") ? Camera.viewW : canvas.width;
    var vh = (typeof Camera !== "undefined") ? Camera.viewH : canvas.height;

    ctx.save();
    ctx.translate(shake.x || 0, shake.y || 0);

    try {
      if (typeof GameMap !== "undefined" && typeof GameMap.draw === "function") {
        GameMap.draw(ctx, cx, cy, vw, vh, { flags: state.flags });
      } else {
        ctx.fillStyle = "#355c3a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#e8dcc0";
        ctx.font = "16px monospace";
        ctx.fillText("MAP MISSING", 20, 40);
      }
    } catch (err) {
      console.error("[Game] map draw", err);
      ctx.fillStyle = "#c0392b";
      ctx.font = "14px monospace";
      ctx.fillText("Map error: " + (err.message || err), 20, 40);
    }

    try {
      if (state.projectiles) {
        for (var i = 0; i < state.projectiles.length; i++) {
          var proj = state.projectiles[i];
          var ps = Camera.worldToScreen(proj.x, proj.y);
          if (typeof drawProjectile === "function") drawProjectile(ctx, ps.x, ps.y, proj);
          else {
            ctx.fillStyle = "#f0e68c";
            ctx.beginPath();
            ctx.arc(ps.x, ps.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
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
          if (typeof drawPlayer === "function") {
            drawPlayer(ctx, ps2.x, ps2.y, pl);
          } else {
            ctx.fillStyle = pl.team === 0 ? "#3d9e58" : "#5a8ec8";
            ctx.beginPath();
            ctx.arc(ps2.x, ps2.y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#e8dcc0";
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.fillText(pl.name || "?", ps2.x, ps2.y - 20);
          }
        }
      }

      drawLightFlashes(ctx);
      if (typeof Particles !== "undefined" && Particles.draw) {
        Particles.draw(ctx, Camera.worldToScreen);
      }
      drawFloatingTexts(ctx);
    } catch (err2) {
      console.error("[Game] entity draw", err2);
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
          camera: typeof Camera !== "undefined" ? Camera : null,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
      }
    } catch (err3) {
      console.error("[Game] HUD", err3);
    }

    if (_frame === 1 || _frame % 300 === 0) {
      console.log("[Game] frame", _frame, "players", (state.players && state.players.length) || 0,
        "cam", Math.round(cx), Math.round(cy), "local", localPlayer ? localPlayer.name : "none");
    }
  }

  function drawNpc(ctx, sx, sy, npc) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(npc.angle || 0);

    var isRam = !!npc.isRam;
    var scale = isRam ? 1.35 : 1;
    var body = npc.color || "#c9a227";
    var r = 10 * scale;

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(r * 0.85, -r * 0.15, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.55);
    ctx.lineTo(r * 0.7, -r * 1.05);
    ctx.lineTo(r * 0.95, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.95, -r * 0.45);
    ctx.lineTo(r * 1.25, -r * 0.95);
    ctx.lineTo(r * 1.35, -r * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1a120c";
    ctx.beginPath();
    ctx.arc(r * 0.95, -r * 0.2, 1.6, 0, Math.PI * 2);
    ctx.arc(r * 1.2, -r * 0.2, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = body;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.quadraticCurveTo(-r * 1.6, -r * 0.8, -r * 1.3, -r * 1.2);
    ctx.stroke();

    var badge = "#fff";
    if (npc.classId === "warrior") badge = "#c0392b";
    else if (npc.classId === "ranger") badge = "#27ae60";
    else if (npc.classId === "mage") badge = "#8e44ad";
    else if (npc.classId === "monk") badge = "#f39c12";
    ctx.strokeStyle = badge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.stroke();

    if (npc.maxHp && npc.hp < npc.maxHp) {
      var pct = npc.hp / npc.maxHp;
      ctx.rotate(-(npc.angle || 0));
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-12, -r - 14, 24, 4);
      ctx.fillStyle = pct > 0.4 ? "#3d9e58" : "#d13a35";
      ctx.fillRect(-12, -r - 14, 24 * pct, 4);
    }

    ctx.restore();
  }

  console.log("[Game] ready");

  return {
    init: init,
    stop: stop,
    applySnapshot: applySnapshot,
    setInput: setInput,
    getLocalPlayer: getLocalPlayer
  };
})();
