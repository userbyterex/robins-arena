/**
 * hud.js — Conquest HUD (paste-safe, no template literals).
 */
const HUD = (() => {
  var _gradCache = new Map();

  function cachedPanelGradient(ctx, key, x0, y0, x1, y1, stops) {
    if (_gradCache.has(key)) return _gradCache.get(key);
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (pair) { g.addColorStop(pair[0], pair[1]); });
    _gradCache.set(key, g);
    return g;
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var ss = s < 10 ? "0" + s : String(s);
    return m + ":" + ss;
  }

  function panel(ctx, x, y, w, h, r) {
    if (r == null) r = 6;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCrosshair(ctx, viewW, viewH) {
    var cx = viewW / 2;
    var cy = viewH / 2;
    var gap = 4;
    var len = 9;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy);
    ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,200,60,0.95)";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.restore();
  }

  function draw(ctx, data) {
    var localPlayer = data.localPlayer;
    var allPlayers = data.allPlayers;
    var flags = data.flags || [];
    var killfeed = data.killfeed || [];
    var timeLeft = data.timeLeft;
    var matchOver = data.matchOver;
    var winnerName = data.winnerName;
    var viewW = data.viewW;
    var viewH = data.viewH;

    ctx.save();
    ctx.font = "18px VT323, monospace";
    ctx.shadowColor = "rgba(0,0,0,0.6)";

    if (localPlayer) {
      ctx.shadowBlur = 0;
      var grad = cachedPanelGradient(ctx, "hpPanel", 14, 14, 14, 96, [
        [0, "rgba(20,24,28,0.88)"], [1, "rgba(20,24,28,0.55)"]
      ]);
      ctx.fillStyle = grad;
      panel(ctx, 12, 12, 220, 90, 6);
      ctx.fill();
      ctx.strokeStyle = localPlayer.team === 0 ? "rgba(61,158,88,0.5)" : "rgba(90,140,200,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      var pct = Math.max(0, localPlayer.hp / MAX_HP);
      ctx.fillStyle = "#0a0c0e";
      panel(ctx, 22, 22, 200, 22, 3); ctx.fill();
      ctx.fillStyle = pct > 0.4 ? "#3dce5c" : "#d13a35";
      panel(ctx, 24, 24, 196 * pct, 18, 2); ctx.fill();

      ctx.fillStyle = "#e8eef4";
      ctx.font = "14px VT323, monospace";
      ctx.textAlign = "center";
      ctx.fillText(Math.round(localPlayer.hp) + " / " + MAX_HP + " HP", 122, 37);

      var weapon = WEAPONS[localPlayer.weapon];
      ctx.textAlign = "left";
      ctx.font = "20px VT323, monospace";
      ctx.fillStyle = "#f0c040";
      ctx.fillText(weapon.icon + " " + weapon.name, 24, 62);

      ctx.font = "14px VT323, monospace";
      ctx.fillStyle = localPlayer.team === 0 ? "#3d9e58" : "#5a8ec8";
      ctx.fillText(localPlayer.team === 0 ? "TEAM CAMP" : "TEAM CASTLE", 24, 82);
    }

    ctx.shadowBlur = 4;
    ctx.fillStyle = "rgba(20,24,28,0.9)";
    panel(ctx, viewW / 2 - 58, 10, 116, 40, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,160,220,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "28px VT323, monospace";
    ctx.fillStyle = timeLeft <= 30 ? "#ff4444" : "#e8eef4";
    ctx.fillText(formatTime(Math.ceil(timeLeft)), viewW / 2, 38);
    ctx.shadowBlur = 0;

    var midFlags = flags.filter(function (f) {
      return f.id !== "camp_hq" && f.id !== "castle_hq";
    });
    var stripY = 56;
    var stripX = viewW / 2 - midFlags.length * 36;
    midFlags.forEach(function (f, i) {
      var x = stripX + i * 72;
      ctx.fillStyle = "rgba(20,24,28,0.85)";
      panel(ctx, x, stripY, 64, 28, 4);
      ctx.fill();
      if (f.team === 0) ctx.fillStyle = "#3d9e58";
      else if (f.team === 1) ctx.fillStyle = "#5a8ec8";
      else ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(x + 14, stripY + 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8eef4";
      ctx.font = "11px VT323, monospace";
      ctx.textAlign = "left";
      var short = f.name.split(" ")[0];
      ctx.fillText(short, x + 24, stripY + 18);
      if (f.progress > 0 && f.progress < 1) {
        ctx.strokeStyle = "#f0c040";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 14, stripY + 14, 9, -Math.PI / 2, -Math.PI / 2 + f.progress * Math.PI * 2);
        ctx.stroke();
      }
    });

    var sorted = allPlayers.slice().sort(function (a, b) { return b.score - a.score; });
    var scoreH = sorted.length * 22 + 14;
    ctx.fillStyle = "rgba(20,24,28,0.9)";
    panel(ctx, viewW - 194, 10, 182, scoreH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,160,220,0.45)";
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.font = "15px VT323, monospace";
    sorted.forEach(function (p, i) {
      ctx.fillStyle = p.team === 0 ? "#3d9e58" : "#5a8ec8";
      ctx.fillText(p.name + "  " + p.score, viewW - 24, 30 + i * 22);
    });

    ctx.font = "14px VT323, monospace";
    killfeed.slice(0, 4).forEach(function (k, i) {
      var weapon = WEAPONS[k.weaponId] || { icon: "?" };
      var age = performance.now() / 1000 - k.at;
      ctx.globalAlpha = Math.max(0.35, 1 - age / 6);
      var text = k.killerName + " killed " + k.targetName + " " + weapon.icon;
      var tw = ctx.measureText(text).width;
      ctx.fillStyle = "#12161a";
      panel(ctx, viewW - 24 - tw - 12, 18 + scoreH + i * 22, tw + 16, 20, 3);
      ctx.globalAlpha *= 0.55;
      ctx.fill();
      ctx.globalAlpha = Math.max(0.35, 1 - age / 6);
      ctx.fillStyle = "#e8eef4";
      ctx.fillText(text, viewW - 24, 33 + scoreH + i * 22);
    });
    ctx.globalAlpha = 1;

    var campHq = null, castleHq = null;
    for (var fi = 0; fi < flags.length; fi++) {
      if (flags[fi].id === "camp_hq") campHq = flags[fi];
      if (flags[fi].id === "castle_hq") castleHq = flags[fi];
    }
    function drawHqBar(label, hq, x, y, teamColor) {
      if (!hq || hq.structureMax == null) return;
      var pct = Math.max(0, (hq.structureHp || 0) / hq.structureMax);
      ctx.fillStyle = "rgba(20,24,28,0.85)";
      panel(ctx, x, y, 140, 28, 4);
      ctx.fill();
      ctx.fillStyle = teamColor;
      ctx.font = "12px VT323, monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, x + 8, y + 12);
      ctx.fillStyle = "#0a0c0e";
      panel(ctx, x + 8, y + 16, 124, 8, 2);
      ctx.fill();
      ctx.fillStyle = pct > 0.35 ? teamColor : "#d13a35";
      panel(ctx, x + 8, y + 16, 124 * pct, 8, 2);
      ctx.fill();
    }
    drawHqBar("CAMP HQ", campHq, 12, viewH - 44, "#3d9e58");
    drawHqBar("CASTLE HQ", castleHq, viewW - 152, viewH - 44, "#5a8ec8");

    ctx.textAlign = "center";
    ctx.font = "12px VT323, monospace";
    ctx.fillStyle = "rgba(232,238,244,0.4)";
    ctx.fillText("Stand on zones to capture · 3 NPCs/zone · 3rd = Ram destroys enemy HQ", viewW / 2, viewH - 56);

    if (localPlayer && localPlayer.alive && !matchOver) {
      drawCrosshair(ctx, viewW, viewH);
    }

    if (matchOver) {
      ctx.fillStyle = "rgba(10,14,18,0.88)";
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.textAlign = "center";
      ctx.font = "42px Cinzel, serif";
      ctx.fillStyle = "#f0c040";
      ctx.fillText("VICTORY", viewW / 2, viewH / 2 - 30);
      ctx.font = "26px VT323, monospace";
      ctx.fillStyle = "#e8eef4";
      ctx.fillText(String(winnerName) + " wins the war", viewW / 2, viewH / 2 + 14);
      ctx.font = "18px VT323, monospace";
      ctx.fillStyle = "rgba(232,238,244,0.65)";
      ctx.fillText("Reload the page to play again", viewW / 2, viewH / 2 + 50);
    }

    ctx.restore();
  }

  return { draw: draw };
})();
