/**
 * hud.js — Tactical circular minimap, zone control, polished bars.
 */
var HUD = (function () {
  console.log("[HUD] loading tactical…");

  var MM_R = 68;
  var MM_MARGIN = 14;
  var terrainCache = null;
  var terrainKey = "";
  var _drawCount = 0;

  function draw(ctx, data) {
    if (!ctx) return;
    try {
      var w = data.canvasWidth || ctx.canvas.width;
      var h = data.canvasHeight || ctx.canvas.height;
      var localPlayer = data.localPlayer;

      drawCrosshair(ctx, w, h);
      drawMinimap(ctx, w, data);
      if (localPlayer) drawPlayerBars(ctx, w, h, localPlayer);
      drawZonePanel(ctx, w, h, data);
      drawScoreboard(ctx, w, data);
      drawTimer(ctx, w, data.timeLeft);
      drawKillfeed(ctx, data.killfeed);
      if (data.matchOver) drawMatchOver(ctx, w, h, data.winnerName, localPlayer);

      _drawCount++;
      if (_drawCount === 1 || _drawCount % 300 === 0) {
        console.log("[HUD.draw] #" + _drawCount);
      }
    } catch (err) {
      console.error("[HUD.draw]", err);
    }
  }

  function drawCrosshair(ctx, w, h) {
    var cx = w / 2;
    var cy = h / 2;
    ctx.strokeStyle = "rgba(232,220,192,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 11, cy);
    ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 11);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,220,192,0.2)";
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function ensureTerrainCache(mapW, mapH) {
    var key = mapW + "x" + mapH;
    if (terrainCache && terrainKey === key) return terrainCache;
    terrainKey = key;
    var size = MM_R * 2;
    var c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    var t = c.getContext("2d");
    t.fillStyle = "#1a2e22";
    t.beginPath();
    t.arc(MM_R, MM_R, MM_R, 0, Math.PI * 2);
    t.fill();

    t.save();
    t.beginPath();
    t.arc(MM_R, MM_R, MM_R, 0, Math.PI * 2);
    t.clip();
    t.fillStyle = "rgba(61,158,88,0.22)";
    t.fillRect(0, 0, size * 0.22, size);
    t.fillStyle = "rgba(90,140,200,0.22)";
    t.fillRect(size * 0.78, 0, size * 0.22, size);

    var sx = size / mapW;
    var sy = size / mapH;

    t.strokeStyle = "rgba(120,95,50,0.4)";
    t.lineWidth = 3;
    t.beginPath();
    t.moveTo(100 * sx, 450 * sy);
    t.quadraticCurveTo(520 * sx, 320 * sy, 800 * sx, 450 * sy);
    t.quadraticCurveTo(1080 * sx, 580 * sy, 1500 * sx, 450 * sy);
    t.stroke();

    if (typeof GameMap !== "undefined" && GameMap.OBSTACLES) {
      for (var i = 0; i < GameMap.OBSTACLES.length; i++) {
        var o = GameMap.OBSTACLES[i];
        var ox = o.x * sx;
        var oy = o.y * sy;
        if (o.type === "tree") {
          t.fillStyle = "#2e6b3a";
          t.beginPath();
          t.arc(ox, oy, 2.2, 0, Math.PI * 2);
          t.fill();
        } else if (o.type === "rock") {
          t.fillStyle = "#6a6e72";
          t.fillRect(ox - 1.5, oy - 1.5, 3, 3);
        } else if (o.type === "bush") {
          t.fillStyle = "rgba(50,120,60,0.5)";
          t.beginPath();
          t.arc(ox, oy, 2, 0, Math.PI * 2);
          t.fill();
        }
      }
    }

    if (typeof GameMap !== "undefined" && GameMap.TOWERS) {
      GameMap.TOWERS.forEach(function (tw) {
        t.fillStyle = tw.team === 0 ? "#3d9e58" : "#5a8ec8";
        t.fillRect(tw.x * sx - 2, tw.y * sy - 2, 4, 4);
      });
    }
    t.restore();
    terrainCache = c;
    return c;
  }

  function drawMinimap(ctx, w, data) {
    if (typeof GameMap === "undefined") return;
    var mapW = GameMap.WIDTH || 1600;
    var mapH = GameMap.HEIGHT || 900;
    var r = MM_R;
    var cx = w - r - MM_MARGIN;
    var cy = r + MM_MARGIN;
    var sx = (r * 2) / mapW;
    var sy = (r * 2) / mapH;

    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(8,12,10,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(201,162,39,0.65)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(201,162,39,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    var terrain = ensureTerrainCache(mapW, mapH);
    ctx.drawImage(terrain, cx - r, cy - r);

    function mx(wx) { return cx - r + wx * sx; }
    function my(wy) { return cy - r + wy * sy; }

    var local = data.localPlayer;
    if (local && local.alive) {
      var fog = ctx.createRadialGradient(mx(local.x), my(local.y), r * 0.25, mx(local.x), my(local.y), r * 1.1);
      fog.addColorStop(0, "rgba(0,0,0,0)");
      fog.addColorStop(0.55, "rgba(0,0,0,0.15)");
      fog.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = fog;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    if (data.flags) {
      for (var i = 0; i < data.flags.length; i++) {
        var f = data.flags[i];
        var col = f.team === 0 ? "#3d9e58" : f.team === 1 ? "#5a8ec8" : "#9a9a9a";
        var isHq = f.id === "camp_hq" || f.id === "castle_hq";
        ctx.fillStyle = col;
        if (isHq) {
          ctx.fillRect(mx(f.x) - 3.5, my(f.y) - 3.5, 7, 7);
          ctx.strokeStyle = "#e8dcc0";
          ctx.lineWidth = 1;
          ctx.strokeRect(mx(f.x) - 3.5, my(f.y) - 3.5, 7, 7);
        } else {
          ctx.beginPath();
          ctx.arc(mx(f.x), my(f.y), 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (f.progress > 0 && f.progress < 1) {
          ctx.strokeStyle = "#f0c040";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(mx(f.x), my(f.y), 6, -Math.PI / 2, -Math.PI / 2 + f.progress * Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    if (data.npcs) {
      ctx.fillStyle = "rgba(220,220,200,0.5)";
      for (var n = 0; n < data.npcs.length; n++) {
        var npc = data.npcs[n];
        if (!npc.alive) continue;
        ctx.fillRect(mx(npc.x) - 1, my(npc.y) - 1, 2, 2);
      }
    }

    if (data.players) {
      for (var p = 0; p < data.players.length; p++) {
        var pl = data.players[p];
        if (!pl.alive) continue;
        var isLocal = local && pl.id === local.id;
        ctx.fillStyle = isLocal ? "#ffffff" : (pl.team === 0 ? "#3d9e58" : "#5a8ec8");
        ctx.beginPath();
        ctx.arc(mx(pl.x), my(pl.y), isLocal ? 3.5 : 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (isLocal) {
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.moveTo(mx(pl.x), my(pl.y));
          var a = pl.angle || 0;
          ctx.arc(mx(pl.x), my(pl.y), 14, a - 0.45, a + 0.45);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#c9a227";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(mx(pl.x), my(pl.y), 5.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(mx(pl.x), my(pl.y));
          ctx.lineTo(mx(pl.x) + Math.cos(a) * 9, my(pl.y) + Math.sin(a) * 9);
          ctx.stroke();
        }
      }
    }

    ctx.restore();

    ctx.strokeStyle = "rgba(201,162,39,0.5)";
    ctx.lineWidth = 1.5;
    for (var t = 0; t < 4; t++) {
      var ang = (t * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * (r + 1), cy + Math.sin(ang) * (r + 1));
      ctx.lineTo(cx + Math.cos(ang) * (r + 6), cy + Math.sin(ang) * (r + 6));
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(201,162,39,0.75)";
    ctx.font = "10px 'VT323', monospace";
    ctx.textAlign = "center";
    ctx.fillText("N", cx, cy - r - 8);
  }

  function drawZonePanel(ctx, w, h, data) {
    if (!data.flags || !data.flags.length) return;
    var zones = data.flags.filter(function (f) {
      return f.id === "nymphs" || f.id === "village" || f.id === "outpost";
    });
    if (!zones.length) return;

    var boxW = 52;
    var gap = 6;
    var totalW = zones.length * boxW + (zones.length - 1) * gap;
    var x0 = (w - totalW) / 2;
    var y = h - 78;

    for (var i = 0; i < zones.length; i++) {
      var f = zones[i];
      var x = x0 + i * (boxW + gap);
      ctx.fillStyle = "rgba(12,14,16,0.75)";
      ctx.strokeStyle = f.team === 0 ? "rgba(61,158,88,0.5)" : f.team === 1 ? "rgba(90,140,200,0.5)" : "rgba(150,150,150,0.3)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, boxW, 22);
      ctx.strokeRect(x, y, boxW, 22);

      ctx.fillStyle = f.team === 0 ? "#3d9e58" : f.team === 1 ? "#5a8ec8" : "#888";
      ctx.font = "11px 'VT323', monospace";
      ctx.textAlign = "center";
      ctx.fillText((f.name || f.id || "?").substring(0, 7), x + boxW / 2, y + 15);

      if (f.progress > 0 && f.progress < 1) {
        ctx.fillStyle = "rgba(240,192,64,0.7)";
        ctx.fillRect(x + 2, y + 19, (boxW - 4) * f.progress, 2);
      }
    }
  }

  function drawPlayerBars(ctx, w, h, p) {
    var barW = 190;
    var barH = 11;
    var x = 16;
    var y = h - 54;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
    var hpPct = Math.max(0, Math.min(1, p.hp / (p.maxHp || 100)));
    var hpGrad = ctx.createLinearGradient(x, 0, x + barW, 0);
    if (hpPct > 0.5) {
      hpGrad.addColorStop(0, "#2e8a45");
      hpGrad.addColorStop(1, "#4fce6c");
    } else if (hpPct > 0.25) {
      hpGrad.addColorStop(0, "#a07820");
      hpGrad.addColorStop(1, "#c9a227");
    } else {
      hpGrad.addColorStop(0, "#8a2727");
      hpGrad.addColorStop(1, "#d1453f");
    }
    ctx.fillStyle = hpGrad;
    ctx.fillRect(x, y, barW * hpPct, barH);

    ctx.fillStyle = "#e8dcc0";
    ctx.font = "14px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText(Math.ceil(p.hp) + " / " + (p.maxHp || 100), x, y - 5);

    var cls = typeof getClass === "function" ? getClass(p.classId) : null;
    var ultName = cls && cls.ability ? cls.ability.name : "ULTIMATE";
    var icon = p.classId === "warrior" ? "⚔" : p.classId === "ranger" ? "🏹" : p.classId === "mage" ? "🔮" : "✦";

    var ultPct = (p.ultimateCharge || 0) / 100;
    var ultY = y + barH + 7;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 1, ultY - 1, barW + 2, 9);
    if (ultPct >= 1) {
      var pulse = (Math.sin(performance.now() / 180) + 1) / 2;
      ctx.fillStyle = "rgba(201,162,39," + (0.7 + pulse * 0.3) + ")";
      ctx.shadowColor = "#c9a227";
      ctx.shadowBlur = 8 * pulse;
    } else {
      ctx.fillStyle = "#4a4a4a";
    }
    ctx.fillRect(x, ultY, barW * Math.min(ultPct, 1), 7);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ultPct >= 1 ? "rgba(201,162,39,0.8)" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, ultY, barW, 7);

    ctx.fillStyle = ultPct >= 1 ? "#c9a227" : "#888";
    ctx.font = "12px 'VT323', monospace";
    ctx.fillText(icon + " " + (ultPct >= 1 ? ultName.toUpperCase() + " READY" : ultName), x, ultY - 3);
  }

  function drawScoreboard(ctx, w, data) {
    if (!data.players || !data.players.length) return;
    var players = data.players.slice().sort(function (a, b) {
      return (b.score || 0) - (a.score || 0);
    });
    var rowH = 18;
    var pad = 6;
    var boxW = 180;
    var boxH = pad * 2 + players.length * rowH;
    var x = (w - boxW) / 2;
    var y = 10;

    ctx.fillStyle = "rgba(12,14,16,0.78)";
    ctx.strokeStyle = "rgba(201,162,39,0.28)";
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
      var icon = p.classId === "warrior" ? "⚔" : p.classId === "ranger" ? "🏹" : p.classId === "mage" ? "🔮" : "✦";
      ctx.fillStyle = p.team === 0 ? "#3d9e58" : "#5a8ec8";
      ctx.font = "bold 12px 'VT323', monospace";
      ctx.textAlign = "left";
      ctx.fillText(icon + " " + (p.name || "?").substring(0, 9), x + pad, py + 10);
      ctx.fillStyle = "#e8dcc0";
      ctx.textAlign = "right";
      ctx.fillText(String(p.score || 0), x + boxW - pad, py + 10);
    }
  }

  function drawTimer(ctx, w, timeLeft) {
    var mins = Math.floor((timeLeft || 0) / 60);
    var secs = Math.floor((timeLeft || 0) % 60);
    var txt = mins + ":" + (secs < 10 ? "0" : "") + secs;
    var x = w - MM_R * 2 - MM_MARGIN - 16;
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
      var icon = k.weaponId === "bow" ? "🏹" : k.weaponId === "crossbow" ? "⚡" : "⚔️";
      ctx.fillText((k.killerName || "?") + " " + icon + " " + (k.targetName || "?"), x, y + i * 16);
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

  console.log("[HUD] ready — circular tactical minimap");
  return { draw: draw };
})();
