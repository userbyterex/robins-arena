/**
 * game.js
 * Une motor, red, combate y HUD. Expone Game.init(payload, isHost, myId) y
 * Game.start(canvas), llamado desde main.js cuando arranca la partida.
 */
const Game = (() => {
  let canvas, ctx;
  let isHost = false;
  let myId = null;
  let rafId = null;
  let netIntervalId = null;
  let lastFrameTime = 0;
  let currentWeapon = "sword";
  let running = false;
  let vignetteGradient = null;

  function buildVignette() {
    const g = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.35,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.75
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    return g;
  }

  let shakeMag = 0;
  let prevLocalHp = null;

  function playEventFX(events) {
    for (const ev of events) {
      if (ev.kind === "melee") { AudioFX.meleeSwing(); }
      else if (ev.kind === "ranged") { AudioFX.shoot(); Particles.muzzlePuff(ev.x, ev.y); }
      else if (ev.kind === "hit") { AudioFX.hit(); Particles.hitSpark(ev.x, ev.y); }
      else if (ev.kind === "death") { AudioFX.death(); Particles.deathBurst(ev.x, ev.y); }
    }
  }

  function init(payload, hostFlag, localId) {
    isHost = hostFlag;
    myId = localId;
    currentWeapon = "sword";
    shakeMag = 0;
    prevLocalHp = null;
    Particles.clear();

    if (isHost) {
      HostSim.init(payload.players);
      Network.onMessage("input", (msg, fromPeerId) => {
        HostSim.setInput(fromPeerId, msg);
      });
      Network.onMessage("peer-left", (msg) => {
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
    TouchControls.init();

    function selectWeapon(w) {
      currentWeapon = w;
      WeaponBar.setActive(w);
    }
    Input.onWeaponSelect(selectWeapon);
    WeaponBar.init(document.getElementById("weapon-bar"), selectWeapon);
    WeaponBar.setActive(currentWeapon);

    AudioFX.resume();

    running = true;
    lastFrameTime = performance.now();

    // Loop de red: recoge input local, lo envía o lo aplica directo si somos host.
    netIntervalId = setInterval(networkTick, 1000 / HostSim.TICK_RATE);
    // Loop de render: 60fps vía rAF.
    rafId = requestAnimationFrame(renderLoop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (netIntervalId) clearInterval(netIntervalId);
  }

  function buildLocalInput() {
    const move = Input.getMoveVector();
    return {
      type: "input",
      dx: move.dx,
      dy: move.dy,
      angle: Input.getAimAngle(),
      attack: Input.isAttacking(),
      weapon: currentWeapon,
    };
  }

  function networkTick() {
    const input = buildLocalInput();
    if (isHost) {
      HostSim.setInput(myId, input);
      HostSim.tick(1 / HostSim.TICK_RATE);
      playEventFX(HostSim.getTickEvents());
      Network.send(HostSim.getSnapshotPayload());
    } else {
      Network.send(input);
    }
  }

  function renderLoop() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    let players, projectiles, killfeed, timeLeft, matchOver, winnerName, localPlayer;

    if (isHost) {
      const state = HostSim.getState();
      players = state.players;
      projectiles = state.projectiles;
      killfeed = state.killfeed;
      timeLeft = state.timeLeft;
      matchOver = state.matchOver;
      winnerName = state.winnerName;
      localPlayer = players.find((p) => p.id === myId);
    } else {
      ClientSync.update();
      players = ClientSync.getPlayers();
      projectiles = ClientSync.getProjectiles();
      killfeed = ClientSync.getKillfeed();
      timeLeft = ClientSync.getTimeLeft();
      matchOver = ClientSync.isMatchOver();
      winnerName = ClientSync.getWinnerName();
      localPlayer = players.find((p) => p.id === myId);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!localPlayer) {
      ctx.fillStyle = "#1a2b1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e8dcc0";
      ctx.font = "20px VT323, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Conectando con el campamento...", canvas.width / 2, canvas.height / 2);
      rafId = requestAnimationFrame(renderLoop);
      return;
    }

    // Screen shake al recibir daño el jugador local.
    if (prevLocalHp !== null && localPlayer.hp < prevLocalHp) {
      shakeMag = Math.min(14, shakeMag + (prevLocalHp - localPlayer.hp) * 0.25 + 4);
    }
    prevLocalHp = localPlayer.hp;
    shakeMag *= 0.9;
    const shakeX = shakeMag > 0.3 ? (Math.random() - 0.5) * shakeMag : 0;
    const shakeY = shakeMag > 0.3 ? (Math.random() - 0.5) * shakeMag : 0;

    Camera.follow(localPlayer.x, localPlayer.y);
    Particles.update(dt);
    WeaponBar.setActive(localPlayer.weapon);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    GameMap.draw(ctx, Camera.x, Camera.y, Camera.viewW, Camera.viewH);

    const drawOrder = [...players].sort((a, b) => a.y - b.y); // pseudo-profundidad
    for (const p of drawOrder) {
      const s = Camera.worldToScreen(p.x, p.y);
      drawPlayer(ctx, s.x, s.y, p);
    }
    for (const proj of projectiles) {
      const s = Camera.worldToScreen(proj.x, proj.y);
      drawProjectile(ctx, s.x, s.y, proj);
    }
    Particles.draw(ctx, (wx, wy) => Camera.worldToScreen(wx, wy));

    ctx.restore();

    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    HUD.draw(ctx, {
      localPlayer, allPlayers: players, killfeed, timeLeft, matchOver, winnerName,
      viewW: canvas.width, viewH: canvas.height,
    });

    rafId = requestAnimationFrame(renderLoop);
  }

  return { init, start, stop };
})();
