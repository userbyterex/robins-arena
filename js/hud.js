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
    var mapW = GameMap.WIDTH;
    var mapH = GameMap.HEIGHT;
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
    ctx.textAlign
    
