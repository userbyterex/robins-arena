/**
 * hud.js — Conquest HUD + ultimate charge bar (replaces ability cooldown circle).
 */
var HUD = (function () {
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

  function drawUltimateBar(ctx, x, y, w, h, charge, maxCharge, ultName, ultIcon, ready) {
    // Background
    ctx.fillStyle = "rgba(20,24,28,0.88)";
    panel(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = ready ? "rgba(201,162,39,0.8)" : "rgba(100,100,100,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Fill
    var pct = Math.min(1, Math.max(0, charge / maxCharge));
    var barGrad = ctx.createLinearGradient(x, y, x, y + h);
    if (ready) {
      barGrad.addColorStop(0, "#c9a227");
      barGrad.addColorStop(1, "#e8d060");
    } else {
      barGrad.addColorStop(0, "#3a3050");
      barGrad.addColorStop(1, "#4a4070");
    }
    ctx.fillStyle = barGrad;
    panel(ctx, x + 2, y + 2, (w - 4) * pct, h - 4, 2);
    ctx.fill();

    // Text
    ctx.fillStyle = ready ? "#f0e0a0" : "#aaa";
    ctx.font = "12px VT323, monospace";
    ctx.textAlign = "left";
    ctx.fillText(ultIcon + " " + ultName + (ready ? " [READY]" : " " + Math.floor(pct * 100) + "%"), x + 6, y + h / 2 + 4);

    // Glow if ready
    if (ready) {
      ctx.shadowColor = "rgba(201,162,39,0.5)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(201,162,39,0.6)";
      ctx.lineWidth = 1;
      panel(ctx, x, y, w, h, 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
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
    var serverTime = data.serverTime || (performance.now() / 1000);

    ctx.save();
    ctx.font = "18px VT323, monospace";
    ctx.shadowColor = "rgba(0,0,0,0.6)";

    if (localPlayer) {
      var maxHp = localPlayer.maxHp || MAX_HP || 100;
      var cls = (typeof getClass === "function") ? getClass(localPlayer.classId || "warrior") : null;

      ctx.shadowBlur = 0;
      var grad = cachedPanelGradient(ctx, "hpPanel", 14, 14, 14, 110, [
        [0, "rgba(20,24,28,0.88)"], [1, "rgba(20,24,28,0.55)"]
      ]);
      ctx.fillStyle = grad;
      panel(ctx, 12, 12, 230, 108, 6);
      ctx.fill();
      ctx.strokeStyle = localPlayer.team === 0 ? "rgba(61,158,88,0.5)" : "rgba(90,140,200,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      var pct = Math.max(0, localPlayer.hp / maxHp);
      ctx.fillStyle = "#0a0c0e";
      panel(ctx, 22, 22, 210, 22, 3); ctx.fill();
      ctx.fillStyle = pct > 0.4 ? "#3dce5c" : "#d13a35";
      panel(ctx, 24, 24, 206 * pct, 18, 2); ctx.fill();

      ctx.fillStyle = "#e8eef4";
      ctx.font = "16px VT323, monospace";
      ctx.textAlign = "left";
      ctx.fillText(Math.round(localPlayer.hp) + " / " + maxHp, 28, 38);

      // Class name
      ctx.font = "14px VT323, monospace";
      ctx.fillStyle = "#aaa";
      ctx.fillText((cls ? cls.icon + " " + cls.name : ""), 28, 56);

      // Passive
      if (cls && cls.passive) {
        ctx.fillStyle = "#888";
        ctx.font = "11px VT323, monospace";
        ctx.fillText("Passive: " + cls.passive.name, 28, 70);
      }

      // Weapon
      var w = WEAPONS[localPlayer.weapon];
      ctx.fillStyle = "#e8dcc0";
      ctx.font = "14px VT323, monospace";
      ctx.fillText((w ? w.icon + " " + w.name : ""), 28, 88);

      // Ultimate bar (NEW — replaces ability cooldown circle)
      if (cls && cls.ultimate) {
        var ult = cls.ultimate;
        var charge = localPlayer.ultimateCharge || 0;
        var ready = charge >= ult.cost;
        drawUltimateBar(ctx, 22, 94, 210, 20, charge, ult.cost, ult.name, ult.icon, ready);
      }

      ctx.shadowBlur = 0;
    }

    // Scoreboard
    var scores = (allPlayers || []).slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var scoreX = viewW - 12;
    var scoreY = 12;
    ctx.fillStyle = "rgba(20,24,28,0.75)";
    panel(ctx, scoreX - 190, scoreY, 190, 28 + scores.length * 22, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(232,220,192,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#e8dcc0";
    ctx.font = "bold 16px VT323, monospace";
    ctx.textAlign = "right";
    ctx.fillText("Scoreboard", scoreX - 14, scoreY + 22);

    for (var i = 0; i < scores.length; i++) {
      var p = scores[i];
      var y = scoreY + 40 + i * 22;
      ctx.fillStyle = p.team === 0 ? "#3d9e58" : "#5a8ec8";
      ctx.font = "14px VT323, monospace";
      ctx.textAlign = "left";
      ctx.fillText((p.name || "?").slice(0, 14), scoreX - 180, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#e8dcc0";
      ctx.fillText(String(p.score || 0), scoreX - 14, y);
    }

    // Timer
    ctx.fillStyle = "rgba(20,24,28,0.75)";
    panel(ctx, viewW / 2 - 50, 12, 100, 32, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(232,220,192,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#e8dcc0";
    ctx.font = "20px VT323, monospace";
    ctx.textAlign = "center";
    ctx.fillText(formatTime(timeLeft || 0), viewW / 2, 34);

    // Kill feed
    ctx.textAlign = "right";
    for (var k = 0; k < killfeed.length; k++) {
      var kf = killfeed[k];
      var age = serverTime - (kf.at || 0);
      if (age > 6) continue;
      var alpha = age > 4 ? 1 - (age - 4) / 2 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(20,24,28,0.7)";
      panel(ctx, viewW - 310, 58 + k * 22, 300, 20, 4);
      ctx.fill();
      ctx.fillStyle = "#e8dcc0";
      ctx.font = "13px VT323, monospace";
      var wpn = WEAPONS[kf.weaponId];
      var txt = (kf.killerName || "?") + " " + (wpn ? wpn.icon : "⚔️") + " " + (kf.targetName || "?");
      ctx.fillText(txt, viewW - 14, 72 + k * 22);
      ctx.globalAlpha = 1;
    }

    // Match over screen
    if (matchOver) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.fillStyle = "#e8dcc0";
      ctx.font = "bold 32px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillText("The Hunt Ends", viewW / 2, viewH / 2 - 40);
      ctx.font = "20px VT323, monospace";
      ctx.fillText("Winner: " + (winnerName || "Draw"), viewW / 2, viewH / 2);
      ctx.font = "16px VT323, monospace";
      ctx.fillText("Press ESC to return to camp", viewW / 2, viewH / 2 + 36);
    }

    drawCrosshair(ctx, viewW, viewH);
    ctx.restore();
  }

  return { draw: draw };
})();
  
