/**
 * entities/projectile.js
 */
let projectileIdCounter = 1;

function createProjectile(owner, weaponId) {
  const weapon = WEAPONS[weaponId];
  return {
    id: projectileIdCounter++,
    ownerId: owner.id,
    weaponId,
    x: owner.x + Math.cos(owner.angle) * (PLAYER_RADIUS + 4),
    y: owner.y + Math.sin(owner.angle) * (PLAYER_RADIUS + 4),
    vx: Math.cos(owner.angle) * weapon.speed,
    vy: Math.sin(owner.angle) * weapon.speed,
    damage: weapon.damage,
    radius: weapon.projectileRadius,
    angle: owner.angle,
    ttl: 2.0, // segundos de vida máxima
  };
}

function drawProjectile(ctx, screenX, screenY, proj) {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(proj.angle);

  // Rastro (motion trail)
  const trailGrad = ctx.createLinearGradient(-22, 0, 0, 0);
  trailGrad.addColorStop(0, "rgba(232,220,192,0)");
  trailGrad.addColorStop(1, "rgba(232,220,192,0.5)");
  ctx.strokeStyle = trailGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-8, 0);
  ctx.stroke();

  ctx.strokeStyle = proj.weaponId === "crossbow" ? "#c9a227" : "#e8dcc0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.stroke();
  // aletas
  ctx.strokeStyle = "rgba(122,31,43,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(-12, -3);
  ctx.moveTo(-8, 0); ctx.lineTo(-12, 3);
  ctx.stroke();
  // punta
  ctx.fillStyle = "#8a1f1f";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(3, -3);
  ctx.lineTo(3, 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
