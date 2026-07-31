/**
 * hud.js — Rectangular minimap, bars, scoreboard, killfeed, timer.
 * With integration logging.
 */
var HUD = (function () {
  console.log("[HUD] loading…");

  var MM_W = 160;
  var MM_H = 90;
  var MM_MARGIN = 12;
  var _drawCount = 0;

  function draw(ctx, data) {
    if (!ctx) {
      console.error("[HUD.draw] no ctx");
      return;
    }
    try {
      var w = data.canvasWidth || ctx.canvas.width;
      var h = data.canvasHeight || ctx.canvas.height;
      var localPlayer = data.localPlayer;

      drawCrosshair(ctx, w, h);
      drawMinimap(ctx, w, data);
      if (localPlayer) drawPlayerBars(ctx, w, h, localPlayer);
      drawScoreboard(ctx, w, data);
      drawTimer(ctx, w, data.timeLeft);
      drawKillfeed(ctx, data.killfeed);
      if (data.matchOver) drawMatchOver(ctx, w, h, data.winnerName, localPlayer);

      _drawCount++;
      if (_drawCount === 1 || _drawCount % 300 === 0) {
        console.log("[HUD.draw] ok #" + _drawCount, "players", (data.players && data.players.length) || 0);
      }
    } catch (err) {
      console.error("[HUD.draw] ERROR", err);
    }
  }

  function drawCrosshair(ctx, w, h) {
    var cx = w / 2;
    var cy = h / 2;
    ctx.strokeStyle = "rgba(232,220,192,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,220,192,0.15)";
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMinimap(ctx, w, data) {
    if (typeof GameMap === "undefined") {
      if (_drawCount < 3) console.warn("[HUD] GameMap missing — minimap skipped");
      return;
    }
    var mapW = GameMap.WIDTH || 1600;
    var mapH = GameMap.HEIGHT || 900;
    var mmW = MM_W;
    var mmH = MM_H;
    var x = w - mmW - MM_MARGIN;
    var y = MM_MARGIN;
    var sx = mmW / mapW;
    var sy = mmH / mapH;

    // Frame
    ctx.fillStyle = "rgba(8,12,10,0.88)";
    ctx.fillRect(x - 3, y - 3, mmW + 6, mmH + 6);
    ctx.strokeStyle = "rgba(201,162,39,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, mmW + 6, mmH + 6);

    // Terrain
    ctx.fillStyle = "#1e3224";
    ctx.fillRect(x, y, mmW, mmH);

    // Team sides
    ctx.fillStyle = "rgba(61,158,88,0.25)";
    ctx.fillRect(x, y, mmW * 0.18, mmH);
    ctx.fillStyle = "rgba(90,140,200,0.25)";
    ctx.fillRect(x + mmW * 0.82, y, mmW * 0.18, mmH);

    // Path
    ctx.strokeStyle = "rgba(120,95,50,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 100 * sx, y + 450 * sy);
    ctx.quadraticCurveTo(x + 520 * sx, y + 320 * sy, x + 800 * sx, y + 450 * sy);
    ctx.quadraticCurveTo(x + 1080 * sx, y + 580 * sy, x + 1500 * sx, y + 450 * sy);
    ctx.stroke();

    function mx(wx) { return x + wx * sx; }
    function my(wy) { return y + wy * sy; }

    // Zones
    if (data.flags) {
      for (var i = 0; i < data.flags.length; i++) {
        var f = data.flags[i];
        var col = f.team === 0 ? "#3d9e58" : f.team === 1 ? "#5a8ec8" : "#9a9a9a";
        var isHq = f.id === "camp_hq" || f.id === "castle_hq";
        ctx.fillStyle = col;
        if (isHq) {
          ctx.fillRect(mx(f.x) - 4, my(f.y) - 4, 8, 8);
          ctx.strokeStyle = "#e8dcc0";
          ctx.lineWidth = 1;
          ctx.strokeRect(mx(f.x) - 4, my(f.y) - 4, 8, 8);
        } else {
          ctx.beginPath();
          ctx.arc(mx(f.x), my(f.y), 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // NPCs
    if (data.npcs) {
      ctx.fillStyle = "rgba(220,220,200,0.45)";
      for (var n = 0; n < data.npcs.length; n++) {
        var npc = data.npcs[n];
        if (!npc.alive) continue;
        ctx.fillRect(mx(npc.x) - 1, my(npc.y) - 1, 2, 2);
      }
    }

    // Players
    if (data.players) {
      for (var p = 0; p < data.players.length; p++) {
        var pl = data.players[p];
        if (!pl.alive) continue;
        var isLocal = data.localPlayer && pl.id === data.localPlayer.id;
        ctx.fillStyle = isLocal ? "#ffffff" : (pl.team === 0 ? "#3d9e58" : "#5a8ec8");
        ctx.beginPath();
        ctx.arc(mx(pl.x), my(pl.y), isLocal ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (isLocal) {
          ctx.strokeStyle = "#c9a227";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(mx(pl.x), my(pl.y), 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mx(pl.x), my(pl.y));
          ctx.lineTo(
            mx(pl.x) + Math.cos(pl.angle || 0) * 8,
            my(pl.y) + Math.sin(pl.angle || 0) * 8
          );
          ctx.stroke();
        }
      }
    }

    // Camera viewport
    if (data.camera) {
      var cam = data.camera;
      var vx = mx(cam.x || 0);
      var vy = my(cam.y || 0);
      var vw = (cam.viewW || 0) * sx;
      var vh = (cam.viewH || 0) * sy;
      ctx.strokeStyle = "rgba(232,220,192,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(vx, vy, vw, vh);
    }

    ctx.fillStyle = "rgba(201,162,39,0.7)";
    ctx.font = "11px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText("MAP", x + 4, y + mmH - 4);
  }

  function drawPlayerBars(ctx, w, h, p) {
    var barW = 180;
    var barH = 10;
    var x = 16;
    var y = h - 52;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, barW, barH);
    var hpPct = p.hp / (p.maxHp || 100);
    ctx.fillStyle = hpPct > 0.5 ? "#3d9e58" : hpPct > 0.25 ? "#c9a227" : "#d13a35";
    ctx.fillRect(x, y, barW * Math.max(0, hpPct), barH);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barW, barH);

    ctx.fillStyle = "#e8dcc0";
    ctx.font = "14px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText(Math.ceil(p.hp) + " / " + (p.maxHp || 100), x, y - 5);

    var cls = typeof getClass === "function" ? getClass(p.classId) : null;
    var ultName = cls && cls.ability ? cls.ability.name : "ULTIMATE";

    var ultPct = (p.ultimateCharge || 0) / 100;
    var ultY = y + barH + 6;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, ultY, barW, 7);
    ctx.fillStyle = ultPct >= 1 ? "#c9a227" : "#4a4a4a";
    ctx.fillRect(x, ultY, barW * Math.min(ultPct, 1), 7);
    ctx.strokeStyle = ultPct >= 1 ? "rgba(201,162,39,0.7)" : "rgba(255,255,255,0.1)";
    ctx.strokeRect(x, ultY, barW, 7);

    if (ultPct >= 1) {
      ctx.fillStyle = "#c9a227";
      ctx.font = "12px 'VT323', monospace";
      ctx.fillText(ultName.toUpperCase() + " READY", x, ultY - 3);
      var pulse = (Math.sin(performance.now() / 200) + 1) / 2;
      ctx.shadowColor = "#c9a227";
      ctx.shadowBlur = 8 * pulse;
      ctx.strokeRect(x, ultY, barW, 7);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#888";
      ctx.font = "11px 'VT323', monospace";
      ctx.fillText(ultName, x, ultY - 3);
    }
  }

  function drawScoreboard(ctx, w, data) {
    if (!data.players || !data.players.length) return;
    var players = data.players.slice().sort(function (a, b) {
      return (b.score || 0) - (a.score || 0);
    });
    var rowH = 18;
    var pad = 6;
    var boxW = 170;
    var boxH = pad * 2 + players.length * rowH;
    var x = (w - boxW) / 2;
    var y = 10;

    ctx.fillStyle = "rgba(12,14,16,0.75)";
    ctx.strokeStyle = "rgba(201,162,39,0.25)";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeRect(x, y, boxW, boxH);

    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var py = y + pad + i * rowH;
      var isLocal = data.localPlayer && p.id === data.localPlayer.id;
      if (isLocal) {
        ctx.fillStyle = "rgba(201,162,39,0.15)";
        ctx.fillRect(x + 2, py - 2, boxW - 4, rowH);
      }
      ctx.fillStyle = p.team === 0 ? "#3d9e58" : "#5a8ec8";
      ctx.font = "bold 12px 'VT323', monospace";
      ctx.textAlign = "left";
      ctx.fillText((p.name || "?").substring(0, 10), x + pad + 2, py + 10);
      ctx.fillStyle = "#e8dcc0";
      ctx.textAlign = "right";
      ctx.fillText(String(p.score || 0), x + boxW - pad, py + 10);
    }
  }

  function drawTimer(ctx, w, timeLeft) {
    var mins = Math.floor((timeLeft || 0) / 60);
    var secs = Math.floor((timeLeft || 0) % 60);
    var txt = mins + ":" + (secs < 10 ? "0" : "") + secs;
    var x = w - MM_W - MM_MARGIN - 12;
    var y = 28;

    ctx.fillStyle = (timeLeft || 0) < 30 ? "#d13a35" : "#e8dcc0";
    ctx.font = "22px 'VT323', monospace";
    ctx.textAlign = "right";
    ctx.fillText(txt, x, y);

    if ((timeLeft || 0) < 30 && Math.floor(performance.now() / 500) % 2 === 0) {
      ctx.fillStyle = "rgba(209,58,53,0.25)";
      ctx.fillRect(x - 55, y - 18, 60, 22);
    }
  }

  function drawKillfeed(ctx, killfeed) {
    if (!killfeed || !killfeed.length) return;
    var x = 14;
    var y = 14;
    var lineH = 16;
    ctx.textAlign = "left";
    for (var i = 0; i < killfeed.length; i++) {
      var k = killfeed[i];
      var age = (performance.now() / 1000) - (k.at || 0);
      var alpha = Math.max(0, 1 - age / 6);
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#e8dcc0";
      ctx.font = "13px 'VT323', monospace";
      var weaponIcon = k.weaponId === "bow" ? "🏹" : k.weaponId === "crossbow" ? "⚡" : "⚔️";
      ctx.fillText((k.killerName || "?") + " " + weaponIcon + " " + (k.targetName || "?"), x, y + i * lineH);
      ctx.restore();
    }
  }

  function drawMatchOver(ctx, w, h, winnerName, localPlayer) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, w, h);

    var isWinner = false;
    if (localPlayer && winnerName) {
      isWinner = (localPlayer.team === 0 && winnerName === "Camp") ||
                 (localPlayer.team === 1 && winnerName === "Castle");
    }

    var cx = w / 2;
    var cy = h / 2;
    ctx.fillStyle = isWinner ? "#c9a227" : "#888";
    ctx.font = "bold 48px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.fillText(isWinner ? "VICTORY" : "DEFEAT", cx, cy - 20);

    ctx.fillStyle = "#e8dcc0";
    ctx.font = "20px 'VT323', monospace";
    ctx.fillText((winnerName || "Draw") + " wins the hunt!", cx, cy + 20);

    ctx.fillStyle = "#a09888";
    ctx.font = "14px 'VT323', monospace";
    ctx.fillText("Press ESC to return to lobby", cx, cy + 55);
  }

  console.log("[HUD] ready — minimap", MM_W + "x" + MM_H);

  return { draw: draw };
})();
