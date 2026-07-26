/**
 * entities/projectile.js
 * No template literals (paste-safe).
 */
var projectileIdCounter = 1;

function createProjectile(owner, weaponId) {
  var weapon = WEAPONS[weaponId];
  return {
    id: projectileIdCounter++,
    ownerId: owner.id,
    ownerTeam: owner.team,
    weaponId: weaponId,
    x: owner.x + Math.cos(owner.angle) * (PLAYER_RADIUS + 6),
    y: owner.y + Math.sin(owner.angle) * (PLAYER_RADIUS + 6),
    vx: Math.cos(owner.angle) * weapon.speed,
    vy: Math.sin(owner.angle) * weapon.speed,
    damage: weapon.damage,
    radius: weapon.projectileRadius,
    angle: owner.angle,
    ttl: 2.0,
  };
}

function drawProjectile(ctx, screenX, screenY, proj) {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(proj.angle);

  var trail = ctx.createLinearGradient(-24, 0, 0, 0);
  trail.addColorStop(0, "rgba(255,255,255,0)");
  trail.addColorStop(1, "rgba(255,220,120,0.45)");
  ctx.strokeStyle = trail;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(-6, 0);
  ctx.stroke();

  ctx.strokeStyle = proj.weaponId === "crossbow" ? "#e8b13a" : "#e8e0c8";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(90,160,220,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(-13, -4);
  ctx.moveTo(-8, 0); ctx.lineTo(-13, 4);
  ctx.stroke();

  ctx.fillStyle = "#c03030";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(8, -3.5);
  ctx.lineTo(8, 3.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
