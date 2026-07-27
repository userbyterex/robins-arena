/**
 * entities/player.js
 */
var PLAYER_COLORS = [
  { name: "Verde", body: "#3fae5a", dark: "#276b38" },
  { name: "Azul", body: "#3f7dae", dark: "#274d6b" },
  { name: "Rojo", body: "#ae3f3f", dark: "#6b2727" },
  { name: "Ámbar", body: "#c99b2b", dark: "#7a5e1a" },
];

var PLAYER_RADIUS = 16;
var PLAYER_SPEED = 220;
var MAX_HP = 100;
var RESPAWN_SECONDS = 3;

var _bodyGradientCache = new Map();
function getBodyGradient(ctx, colorIndex) {
  if (_bodyGradientCache.has(colorIndex)) return _bodyGradientCache.get(colorIndex);
  var color = PLAYER_COLORS[colorIndex];
  var g = ctx.createLinearGradient(-PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
  g.addColorStop(0, shade(color.body, 24));
  g.addColorStop(0.55, color.body);
  g.addColorStop(1, color.dark);
  _bodyGradientCache.set(colorIndex, g);
  return g;
}

function createPlayer(id, name, colorIndex, spawnIndex) {
  var spawn = GameMap.SPAWNS[spawnIndex % GameMap.SPAWNS.length];
  return {
    id: id, name: name,
    colorIndex: colorIndex % PLAYER_COLORS.length,
    x: spawn.x, y: spawn.y,
    angle: 0,
    hp: MAX_HP,
    weapon: "sword",
    alive: true,
    score: 0,
    lastAttackAt: -999,
    respawnAt: 0,
    lastHitFlashAt: -999,
    lastAttackAnimAt: -999,
  };
}

function drawPlayer(ctx, screenX, screenY, player) {
  var color = PLAYER_COLORS[player.colorIndex];
  var now = performance.now() / 1000;

  if (!player.alive) return;

  ctx.save();
  ctx.translate(screenX, screenY);

  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, PLAYER_RADIUS * 0.85, PLAYER_RADIUS * 0.95, PLAYER_RADIUS * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  var weapon = WEAPONS[player.weapon];
  var timeSinceAttack = now - player.lastAttackAnimAt;
  var swinging = timeSinceAttack < 0.18;

  ctx.save();
  ctx.rotate(player.angle);
  if (weapon.type === "melee") {
    if (swinging) {
      var t = timeSinceAttack / 0.18;
      var sweep = (weapon.angle * Math.PI) / 180;
      var startA = -sweep / 2 + sweep * Math.min(1, t * 1.3);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = "rgba(232,220,192,0.55)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, weapon.range, startA - 0.35, startA + 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    var bladeLen = weapon.range * 0.65;
    ctx.strokeStyle = "#d8d8d8";
    ctx.lineWidth = weapon.id === "axe" ? 5 : weapon.id === "sword" ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(PLAYER_RADIUS * 0.4, 0);
    ctx.lineTo(PLAYER_RADIUS * 0.4 + bladeLen, 0);
    ctx.stroke();
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(PLAYER_RADIUS * 0.2, -2, PLAYER_RADIUS * 0.3, 4);
  } else {
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(PLAYER_RADIUS * 0.6, 0, 14, -1.1, 1.1);
    ctx.stroke();
    ctx.strokeStyle = "rgba(232,220,192,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    var pull = swinging ? 6 : 0;
    ctx.moveTo(PLAYER_RADIUS * 0.6 + Math.cos(-1.1) * 14, Math.sin(-1.1) * 14);
    ctx.lineTo(PLAYER_RADIUS * 0.6 - pull, 0);
    ctx.lineTo(PLAYER_RADIUS * 0.6 + Math.cos(1.1) * 14, Math.sin(1.1) * 14);
    ctx.stroke();
  }
  ctx.restore();

  var flash = now - player.lastHitFlashAt < 0.12;
  ctx.fillStyle = flash ? "#ffffff" : getBodyGradient(ctx, player.colorIndex);
  roundedSquare(ctx, -PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2, 5);
  ctx.fill();
  ctx.strokeStyle = color.dark;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  roundedSquare(ctx, -PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2, 5);
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.arc(-PLAYER_RADIUS * 0.3, -PLAYER_RADIUS * 0.3, PLAYER_RADIUS * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#1a140f";
  var dirX = Math.cos(player.angle) * PLAYER_RADIUS * 0.5;
  var dirY = Math.sin(player.angle) * PLAYER_RADIUS * 0.5;
  ctx.beginPath();
  ctx.arc(dirX, dirY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.font = "14px VT323, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#00000099";
  ctx.fillText(player.name, 1, -PLAYER_RADIUS - 17);
  ctx.fillStyle = "#e8dcc0";
  ctx.fillText(player.name, 0, -PLAYER_RADIUS - 18);

  var barW = 36, barH = 5;
  ctx.fillStyle = "#241f1a";
  ctx.fillRect(-barW / 2, -PLAYER_RADIUS - 12, barW, barH);
  var hpGrad = ctx.createLinearGradient(-barW / 2, 0, barW / 2, 0);
  if (player.hp > 40) { hpGrad.addColorStop(0, "#2e8a45"); hpGrad.addColorStop(1, "#4fce6c"); }
  else { hpGrad.addColorStop(0, "#8a2727"); hpGrad.addColorStop(1, "#d1453f"); }
  ctx.fillStyle = hpGrad;
  ctx.fillRect(-barW / 2, -PLAYER_RADIUS - 12, barW * Math.max(0, player.hp / MAX_HP), barH);
  ctx.restore();
}

function shade(hex, amt) {
  var num = parseInt(hex.slice(1), 16);
  var r = (num >> 16) + amt, g = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
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
