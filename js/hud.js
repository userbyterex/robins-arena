/**
 * hud.js — CS-style HUD in English (no template literals — paste-safe).
 */
const HUD = (() => {
  const _gradCache = new Map();

  function cachedPanelGradient(ctx, key, x0, y0, x1, y1, stops) {
    if (_gradCache.has(key)) return _gradCache.get(key);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
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
    var killfeed = data.killfeed;
    var timeLeft = data.timeLeft;
    var matchOver = data.matchOver;
    var winnerName = data.winnerName;
    var viewW = data.viewW;
    var viewH = data.viewH;

    ctx.save();
    ctx.font = "18px VT323, monospace";
    ctx.shadowColor = "rgba(0,0,0,0.6)";

    // HP + weapon (top-left)
    if (localPlayer) {
      ctx.shadowBlur = 0;
      var grad = cachedPanelGradient(ctx, "hpPanel", 14, 14, 14, 96, [
        [0, "rgba(20,24,28,0.88)"], [1, "rgba(20,24,28,0.55)"]
      ]);
      ctx.fillStyle = grad;
      panel(ctx, 12, 12, 210, 84, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(90,160,220,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      var pct = Math.max(0, localPlayer.hp / MAX_HP);
      ctx.fillStyle = "#0a0c0e";
      panel(ctx, 22, 22, 190, 24, 3); ctx.fill();
      var hpGrad = pct > 0.4
        ? cachedPanelGradient(ctx, "hpFillGood", 24, 0, 210, 0, [[0, "#2a8a3a"], [1, "#4dce5c"]])
        : cachedPanelGradient(ctx, "hpFillBad", 24, 0, 210, 0, [[0, "#8a2020"], [1, "#d13a35"]]);
      ctx.fillStyle = hpGrad;
      panel(ctx, 24, 24, 186 * pct, 20, 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      panel(ctx, 22, 22, 190, 24, 3); ctx.stroke();

      ctx.fillStyle = "#e8eef4";
      ctx.font = "15px VT323, monospace";
      ctx.textAlign = "center";
      ctx.shadowBlur = 2;
      ctx.fillText(Math.round(localPlayer.hp) + " / " + MAX_HP + " HP", 117, 38);

      var weapon = WEAPONS[localPlayer.weapon];
      ctx.textAlign = "left";
      ctx.font = "22px VT323, monospace";
      ctx.fillStyle = "#f0c040";
      ctx.shadowColor = "rgba(240,192,64,0.4)";
      ctx.shadowBlur = 5;
      ctx.fillText(weapon.icon + " " + weapon.name, 24, 74);
      ctx.shadowBlur = 0;
    }

    // Timer (top center)
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 4;
    var timeGrad = cachedPanelGradient(ctx, "timePanel", 0, 0, 0, 44, [
      [0, "rgba(20,24,28,0.9)"], [1, "rgba(20,24,28,0.55)"]
    ]);
    ctx.fillStyle = timeGrad;
    panel(ctx, viewW / 2 - 58, 10, 116, 40, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,160,220,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "28px VT323, monospace";
    ctx.fillStyle = timeLeft <= 20 ? "#ff4444" : "#e8eef4";
    ctx.fillText(formatTime(Math.ceil(timeLeft)), viewW / 2, 38);
    ctx.shadowBlur = 0;

    // Scoreboard (top-right)
    var sorted = allPlayers.slice().sort(function (a, b) { return b.score - a.score; });
    var scoreH = sorted.length * 22 + 12;
    var scoreGrad = cachedPanelGradient(ctx, "scorePanel" + scoreH, 0, 10, 0, 10 + scoreH, [
      [0, "rgba(20,24,28,0.9)"], [1, "rgba(20,24,28,0.55)"]
    ]);
    ctx.fillStyle = scoreGrad;
    panel(ctx, viewW - 194, 10, 182, scoreH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,160,220,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.font = "16px VT323, monospace";
    sorted.forEach(function (p, i) {
      ctx.fillStyle = PLAYER_COLORS[p.colorIndex].body;
      ctx.fillText(p.name + "  " + p.score, viewW - 24, 30 + i * 22);
    });

    // Kill feed
    ctx.font = "15px VT323, monospace";
    killfeed.slice(0, 4).forEach(function (k, i) {
      var weapon = WEAPONS[k.weaponId];
      var age = performance.now() / 1000 - k.at;
      ctx.globalAlpha = Math.max(0.35, 1 - age / 6);
      ctx.fillStyle = "#12161a";
      var text = k.killerName + " killed " + k.targetName + " " + weapon.icon;
      var tw = ctx.measureText(text).width;
      panel(ctx, viewW - 24 - tw - 12, 18 + scoreH + i * 22, tw + 16, 20, 3);
      ctx.globalAlpha *= 0.55;
      ctx.fill();
      ctx.globalAlpha = Math.max(0.35, 1 - age / 6);
      ctx.fillStyle = "#e8eef4";
      ctx.fillText(text, viewW - 24, 33 + scoreH + i * 22);
    });
    ctx.globalAlpha = 1;

    // Crosshair
    if (localPlayer && localPlayer.alive && !matchOver) {
      drawCrosshair(ctx, viewW, viewH);
    }

    // Victory
    if (matchOver) {
      ctx.fillStyle = "rgba(10,14,18,0.88)";
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.textAlign = "center";
      ctx.shadowColor
