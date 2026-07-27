/**
 * hud.js — Conquest HUD + class ability cooldown.
 * Paste-safe, no template literals.
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
      var maxHp = localPlayer.maxHp || (typeof MAX_HP !== "undefined" ? MAX_HP : 100);
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

      ctx.fillStyle = "#e8eef4
        
