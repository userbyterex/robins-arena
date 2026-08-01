/**
 * entities/player.js — Battle rendering: shadow, shield, stun, flash, class icon.
 */
var PLAYER_COLORS = [
  { name: "Verde", body: "#3fae5a", dark: "#276b38" },
  { name: "Azul", body: "#3f7dae", dark: "#274d6b" },
  { name: "Rojo", body: "#ae3f3f", dark: "#6b2727" },
  { name: "Ambar", body: "#c99b2b", dark: "#7a5e1a" }
];
var PLAYER_RADIUS = 16;
var PLAYER_SPEED = 220;
var MAX_HP = 100;
var RESPAWN_SECONDS = 3;
var _bodyGradientCache = new Map();

function getBodyGradient(ctx, colorIndex) {
  if (_bodyGradientCache.has(colorIndex)) return _bodyGradientCache.get(colorIndex);
  var color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  var g = ctx.createLinearGradient(-PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
  g.addColorStop(0, shade(color.body, 24));
  g.addColorStop(0.55, color.body);
  g.addColorStop(1, color.dark);
  _bodyGradientCache.set(colorIndex, g);
  return g;
}

function createPlayer(id, name, colorIndex, spawnIndex) {
  var spawn = (typeof GameMap !== "undefined" && GameMap.SPAWNS)
    ? GameMap.SPAWNS[spawnIndex % GameMap.SPAWNS.length]
    : { x: 200, y: 400, team: 0 };
  return {
    id: id,
    name: name,
    colorIndex: colorIndex % PLAYER_COLORS.length,
    x: spawn.x,
    y: spawn.y,
    angle: 0,
    hp: MAX_HP,
    maxHp: MAX_HP,
    weapon: "sword",
    alive: true,
    score: 0,
    lastAttackAt: -999,
    respawnAt: 0,
    lastHitFlashAt: -999,
    lastAttackAnimAt: -999,
    team: spawn.team != null ? spawn.team : 0,
    classId: "warrior",
    speedMul: 1,
    abilityCdUntil: 0,
    stunUntil: 0,
    ultimateCharge: 0,
    shield: 0,
    appearance: null
  };
}

function classIcon(classId) {
  if (classId === "warrior") return "⚔";
  if (classId === "ranger") return "🏹";
  if (classId === "mage") return "🔮";
  return "✦";
}

function drawPlayer(ctx, screenX, screenY, player, opts) {
  var now = performance.now() / 1000;
  if (!player.alive) return;
  opts = opts || {};
  var isLocal = !!opts.isLocal;

  ctx.save();
  ctx.translate(screenX, screenY);

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, PLAYER_RADIUS * 0.9, PLAYER_RADIUS * 0.95, PLAYER_RADIUS * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  // Local selection ring
  if (isLocal) {
    ctx.strokeStyle = "rgba(201,162,39,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shield bubble
  if (player.shield > 0) {
    var shPulse = 0.25 + 0.1 * Math.sin(now * 4);
    ctx.strokeStyle = "rgba(90,140,200," + (0.45 + shPulse) + ")";
    ctx.fillStyle = "rgba(90,140,200,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Damage flash
  var flash = now - (player.lastHitFlashAt || -999) < 0.12;

  // Sprite
  var sprite = null;
  if (typeof PixelCharacter !== "undefined" && PixelCharacter.generate) {
    try {
      sprite = PixelCharacter.generate(player.classId || "warrior", player.appearance || {});
    } catch (e) {}
  }

  if (sprite) {
    ctx.save();
    if (flash) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.85;
    }
    ctx.rotate(player.angle + Math.PI / 2);
    var scale = (PLAYER_RADIUS * 2.35) / (PixelCharacter.SPRITE_SIZE || 56);
    ctx.scale(scale, scale);
    ctx.drawImage(sprite, -PixelCharacter.SPRITE_SIZE / 2, -PixelCharacter.SPRITE_SIZE / 2);
    ctx.restore();
  } else {
    ctx.fillStyle = flash ? "#ffffff" : getBodyGradient(ctx, player.colorIndex || 0);
    roundedSquare(ctx, -PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2, 5);
    ctx.fill();
    ctx.strokeStyle = PLAYER_COLORS[(player.colorIndex || 0) % PLAYER_COLORS.length].dark;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Melee swing arc
  var weapon = (typeof WEAPONS !== "undefined") ? WEAPONS[player.weapon] : null;
  var timeSinceAttack = now - (player.lastAttackAnimAt || -999);
  if (timeSinceAttack < 0.18 && weapon && weapon.type === "melee") {
    var t = timeSinceAttack / 0.18;
    var sweep = ((weapon.angle || 60) * Math.PI) / 180;
    var startA = player.angle - sweep / 2 + sweep * Math.min(1, t * 1.3);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    var grad = ctx.createRadialGradient(0, 0, 4, 0, 0, weapon.range || 50);
    grad.addColorStop(0, "rgba(232,220,192,0.7)");
    grad.addColorStop(1, "rgba(232,220,192,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, weapon.range || 50, startA - 0.35, startA + 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Stun indicator (dashed yellow ring)
  if (player.stunUntil && now < player.stunUntil) {
    ctx.strokeStyle = "rgba(240,200,40,0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -now * 20;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_RADIUS + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Facing dot
  ctx.fillStyle = "#1a140f";
  var dirX = Math.cos(player.angle) * PLAYER_RADIUS * 0.55;
  var dirY = Math.sin(player.angle) * PLAYER_RADIUS * 0.55;
  ctx.beginPath();
  ctx.arc(dirX, dirY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Name + class icon + HP
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.font = "13px VT323, monospace";
  ctx.textAlign = "center";
  var label = classIcon(player.classId) + " " + (player.name || "?");
  ctx.fillStyle = "#00000099";
  ctx.fillText(label, 1, -PLAYER_RADIUS - 18);
  ctx.fillStyle = isLocal ? "#c9a227" : "#e8dcc0";
  ctx.fillText(label, 0, -PLAYER_RADIUS - 19);

  var barW = 38;
  var barH = 5;
  ctx.fillStyle = "#241f1a";
  ctx.fillRect(-barW / 2, -PLAYER_RADIUS - 12, barW, barH);
  var hpPct = Math.max(0, player.hp / (player.maxHp || MAX_HP));
  var hpGrad = ctx.createLinearGradient(-barW / 2, 0, barW / 2, 0);
  if (hpPct > 0.4) {
    hpGrad.addColorStop(0, "#2e8a45");
    hpGrad.addColorStop(1, "#4fce6c");
  } else {
    hpGrad.addColorStop(0, "#8a2727");
    hpGrad.addColorStop(1, "#d1453f");
  }
  ctx.fillStyle = hpGrad;
  ctx.fillRect(-barW / 2, -PLAYER_RADIUS - 12, barW * hpPct, barH);

  if (player.shield > 0) {
    ctx.strokeStyle = "#5a8ec8";
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2 - 1, -PLAYER_RADIUS - 13, barW + 2, barH + 2);
  }

  ctx.restore();
}

function shade(hex, amt) {
  var num = parseInt(hex.slice(1), 16);
  var r = Math.max(0, Math.min(255, (num >> 16) + amt));
  var g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  var b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return "rgb(" + r + "," + g + "," + b + ")";
}

function roundedSquare(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
