/**
 * hud.js — Minimap, damage direction, polished scoreboard, killfeed,
 * ultimate charge, match timer, and match-over screen.
 */

var HUD = (function () {
  var MINIMAP_SIZE = 110;
  var MINIMAP_MARGIN = 14;

  function draw(ctx, data) {
    var w = data.canvasWidth || ctx.canvas.width;
    var h = data.canvasHeight || ctx.canvas.height;
    var localPlayer = data.localPlayer;

    drawCrosshair(ctx, w, h, localPlayer);
    drawMinimap(ctx, w, data);
    if (localPlayer) { drawPlayerBars(ctx, w, h, localPlayer); }
    drawScoreboard(ctx, w, data);
    drawTimer(ctx, w, data.timeLeft);
    drawKillfeed(ctx, data.killfeed);
    if (data.matchOver) { drawMatchOver(ctx, w, h, data.winnerName, localPlayer); }
  }

  function drawCrosshair(ctx, w, h, localPlayer) {
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
    if (typeof GameMap === "undefined") return;
    var size = MINIMAP_SIZE;
    var x = w - size - MINIMAP_MARGIN;
    var y = MINIMAP_MARGIN;
    var mapW = GameMap.WIDTH || 2000;
    var mapH = GameMap.HEIGHT || 2000;
    var scale = size / Math.max(mapW, mapH);

    ctx.fillStyle = "rgba(12,14,16,0.85)";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(201,162,39,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    function mx(wx) { return x + wx * scale; }
    function my(wy) { return y + wy * scale; }

    if (data.flags) {
      for (var i = 0; i < data.flags.length; i++) {
        var f = data.flags[i];
        var col = f.team === 0 ? "#3d9e58" : f.team === 1 ? "#5a8ec8" : "#888";
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(mx(f.x), my(f.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (data.players) {
      for (var p = 0; p < data.players.length; p++) {
        var pl = data.players[p];
        if (!pl.alive) continue;
        var isLocal = pl.id === (data.localPlayer && data.localPlayer.id);
        var col = pl.team === 0 ? "#3d9e58" : "#5a8ec8";
        ctx.fillStyle = isLocal ? "#fff" : col;
        ctx.beginPath();
        ctx.arc(mx(pl.x), my(pl.y), isLocal ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
        if (isLocal) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx(pl.x), my(pl.y));
          ctx.lineTo(mx(pl.x) + Math.cos(pl.angle) * 6, my(pl.y) + Math.sin(pl.angle) * 6);
          ctx.stroke();
        }
      }
    }

    if (data.npcs) {
      ctx.fillStyle = "rgba(200,200,200,0.4)";
      for (var n = 0; n < data.npcs.length; n++) {
        var npc = data.npcs[n];
        if (!npc.alive) continue;
        ctx.beginPath();
        ctx.arc(mx(npc.x), my(npc.y), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPlayerBars(ctx, w, h, p) {
    var barW = 180;
    var barH = 10;
    var x = 16;
    var y = h - 50;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x, y, barW, barH);
    var hpPct = p.hp / (p.maxHp || 100);
    var hpColor = hpPct > 0.5 ? "#3d9e58" : hpPct > 0.25 ? "#c9a227" : "#d13a35";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barW * hpPct, barH);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barW, barH);

    ctx.fillStyle = "#e8dcc0";
    ctx.font = "14px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText(Math.ceil(p.hp) + " / " + (p.maxHp || 100), x, y - 6);

    var ultPct = (p.ultimateCharge || 0) / 100;
    var ultY = y + barH + 6;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x, ultY, barW, 6);
    ctx.fillStyle = ultPct >= 1 ? "#c9a227" : "#5a5a5a";
    ctx.fillRect(x, ultY, barW * Math.min(ultPct, 1), 6);
    ctx.strokeStyle = ultPct >= 1 ? "rgba(201,162,39,0.6)" : "rgba(255,255,255,0.1)";
    ctx.strokeRect(x, ultY, barW, 6);

    if (ultPct >= 1) {
      ctx.fillStyle = "#c9a227";
      ctx.font = "12px 'VT323', monospace";
      ctx.fillText("ULTIMATE READY [SPACE]", x, ultY - 4);
      var pulse = (Math.sin(performance.now() / 200) + 1) / 2;
      ctx.shadowColor = "#c9a227";
      ctx.shadowBlur = 10 * pulse;
      ctx.strokeRect(x, ultY, barW, 6);
      ctx.shadowBlur = 0;
    }
  }

  function drawScoreboard(ctx, w, data) {
    if (!data.players || !data.players.length) return;
    var players = data.players.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var rowH = 18;
    var pad = 6;
    var boxW = 160;
    var boxH = pad * 2 + players.length * rowH;
    var x = (w - boxW) / 2;
    var y = 10;

    ctx.fillStyle = "rgba(12,14,16,0.7)";
    ctx.strokeStyle = "rgba(201,162,39,0.2)";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeRect(x, y, boxW, boxH);

    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var py = y + pad + i * rowH;
      var isLocal = data.localPlayer && p.id === data.localPlayer.id;
      ctx.fillStyle = isLocal ? "rgba(201,162,39,0.15)" : "transparent";
      ctx.fillRect(x + 2, py - 2, boxW - 4, rowH);

      ctx.fillStyle = p.team === 0 ? "#3d9e58" : "#5a8ec8";
      ctx.font = "bold 12px 'VT323', monospace";
      ctx.textAlign = "left";
      ctx.fillText((p.name || "?").substring(0, 10), x + pad + 2, py + 10);

      ctx.fillStyle = "#e8dcc0";
      ctx.textAlign = "right";
      ctx.fillText(p.score || 0, x + boxW - pad, py + 10);
    }
  }

  function drawTimer(ctx, w, timeLeft) {
    var mins = Math.floor((timeLeft || 0) / 60);
    var secs = Math.floor((timeLeft || 0) % 60);
    var txt = mins + ":" + (secs < 10 ? "0" : "") + secs;
    var x = w - 80;
    var y = 30;

    ctx.fillStyle = (timeLeft || 0) < 30 ? "#d13a35" : "#e8dcc0";
    ctx.font = "22px 'VT323', monospace";
    ctx.textAlign = "right";
    ctx.fillText(txt, x, y);

    if ((timeLeft || 0) < 30 && Math.floor(performance.now() / 500) % 2 === 0) {
      ctx.fillStyle = "rgba(209,58,53,0.3)";
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

  return { draw: draw };
})();
