/**
 * hud.js
 * Todo el HUD se dibuja directamente sobre el canvas del juego, en espacio
 * de pantalla (no de mundo), después de renderizar la arena.
 */
const HUD = (() => {
  const _gradCache = new Map();
  function cachedPanelGradient(ctx, key, x0, y0, x1, y1, stops) {
    if (_gradCache.has(key)) return _gradCache.get(key);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([offset, color]) => g.addColorStop(offset, color));
    _gradCache.set(key, g);
    return g;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function panel(ctx, x, y, w, h, r = 6) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(ctx, { localPlayer, allPlayers, killfeed, timeLeft, matchOver, winnerName, viewW, viewH }) {
    ctx.save();
    ctx.font = "18px VT323, monospace";
    ctx.shadowColor = "rgba(0,0,0,0.6)";

    // --- Vida + arma (arriba-izquierda, panel de pergamino) ---
    if (localPlayer) {
      ctx.shadowBlur = 0;
      const grad = cachedPanelGradient(ctx, "hpPanel", 14, 14, 14, 96, [
        [0, "rgba(36,31,26,0.82)"], [1, "rgba(36,31,26,0.55)"],
      ]);
      ctx.fillStyle = grad;
      panel(ctx, 12, 12, 210, 84, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(201,162,39,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const pct = Math.max(0, localPlayer.hp / MAX_HP);
      ctx.fillStyle = "#150f0a";
      panel(ctx, 22, 22, 190, 24, 4); ctx.fill();
      const hpGrad = pct > 0.4
        ? cachedPanelGradient(ctx, "hpFillGood", 24, 0, 210, 0, [[0, "#2e8a45"], [1, "#5fce7c"]])
        : cachedPanelGradient(ctx, "hpFillBad", 24, 0, 210, 0, [[0, "#8a2727"], [1, "#d1453f"]]);
      ctx.fillStyle = hpGrad;
      panel(ctx, 24, 24, 186 * pct, 20, 3); ctx.fill();
      ctx.strokeStyle = "rgba(232,220,192,0.4)";
      ctx.lineWidth = 1;
      panel(ctx, 22, 22, 190, 24, 4); ctx.stroke();

      ctx.fillStyle = "#e8dcc0";
      ctx.font = "15px VT323, monospace";
      ctx.textAlign = "center";
      ctx.shadowBlur = 3;
      ctx.fillText(`${Math.round(localPlayer.hp)} / ${MAX_HP} HP`, 117, 38);

      const weapon = WEAPONS[localPlayer.weapon];
      ctx.textAlign = "left";
      ctx.font = "22px VT323, monospace";
      ctx.fillStyle = "#e8b13a";
      ctx.shadowColor = "rgba(201,162,39,0.5)";
      ctx.shadowBlur = 6;
      ctx.fillText(`${weapon.icon} ${weapon.name}`, 24, 74);
      ctx.shadowBlur = 0;
    }

    // --- Cronómetro (arriba centro) ---
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 4;
    const timeGrad = cachedPanelGradient(ctx, "timePanel", 0, 0, 0, 44, [
      [0, "rgba(36,31,26,0.82)"], [1, "rgba(36,31,26,0.5)"],
    ]);
    ctx.fillStyle = timeGrad;
    panel(ctx, viewW / 2 - 62, 10, 124, 40, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(201,162,39,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "26px Cinzel, serif";
    ctx.fillStyle = timeLeft <= 20 ? "#d1453f" : "#e8dcc0";
    ctx.fillText(formatTime(Math.ceil(timeLeft)), viewW / 2, 38);
    ctx.shadowBlur = 0;

    // --- Marcador (arriba-derecha) ---
    const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
    const scoreH = sorted.length * 22 + 12;
    const scoreGrad = cachedPanelGradient(ctx, `scorePanel${scoreH}`, 0, 10, 0, 10 + scoreH, [
      [0, "rgba(36,31,26,0.82)"], [1, "rgba(36,31,26,0.5)"],
    ]);
    ctx.fillStyle = scoreGrad;
    panel(ctx, viewW - 194, 10, 182, scoreH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(201,162,39,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.font = "16px VT323, monospace";
    sorted.forEach((p, i) => {
      ctx.fillStyle = PLAYER_COLORS[p.colorIndex].body;
      ctx.fillText(`${p.name}  ${p.score}`, viewW - 24, 30 + i * 22);
    });

    // --- Kill feed (debajo del marcador) ---
    ctx.font = "15px VT323, monospace";
    killfeed.slice(0, 4).forEach((k, i) => {
      const weapon = WEAPONS[k.weaponId];
      const age = performance.now() / 1000 - k.at;
      ctx.globalAlpha = Math.max(0.35, 1 - age / 6);
      ctx.fillStyle = "#241f1a";
      const text = `${k.killerName} abatió a ${k.targetName} ${weapon.icon}`;
      const tw = ctx.measureText(text).width;
      panel(ctx, viewW - 24 - tw - 12, 18 + scoreH + i * 22, tw + 16, 20, 4);
      ctx.globalAlpha *= 0.55;
      ctx.fill();
      ctx.globalAlpha = Math.max(0.35, 1 - age / 6);
      ctx.fillStyle = "#e8dcc0";
      ctx.fillText(text, viewW - 24, 33 + scoreH + i * 22);
    });
    ctx.globalAlpha = 1;

    // --- Pantalla de victoria ---
    if (matchOver) {
      ctx.fillStyle = "rgba(15,26,18,0.86)";
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(201,162,39,0.6)"; ctx.shadowBlur = 18;
      ctx.font = "44px Cinzel, serif";
      ctx.fillStyle = "#e8b13a";
      ctx.fillText("Fin de la cacería", viewW / 2, viewH / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.font = "26px VT323, monospace";
      ctx.fillStyle = "#e8dcc0";
      ctx.fillText(`${winnerName} se alza victorioso`, viewW / 2, viewH / 2 + 14);
      ctx.font = "18px VT323, monospace";
      ctx.fillStyle = "#e8dcc0aa";
      ctx.fillText("Recarga la página para jugar de nuevo", viewW / 2, viewH / 2 + 50);
    }

    ctx.restore();
  }

  return { draw };
})();
