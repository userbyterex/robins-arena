/**
 * particles.js
 * Sistema de partículas minimalista, 100% Canvas (sin imágenes). Se usa para
 * dar "feedback" visual a golpes, muertes y disparos sin depender de sprites.
 */
const Particles = (() => {
  let items = [];
  const MAX_PARTICLES = 220; // techo de seguridad para dispositivos modestos

  function spawn(opts) {
    if (items.length >= MAX_PARTICLES) items.shift(); // descarta la más vieja
    items.push({
      x: opts.x, y: opts.y,
      vx: opts.vx, vy: opts.vy,
      life: opts.life, maxLife: opts.life,
      size: opts.size,
      color: opts.color,
      gravity: opts.gravity || 0,
      shape: opts.shape || "square", // "square" | "circle"
      fade: opts.fade !== false,
      spin: opts.spin || 0,
      angle: Math.random() * Math.PI * 2,
    });
  }

  // Chispa de impacto: golpe de arma cuerpo a cuerpo o flecha clavándose.
  function hitSpark(x, y, color = "#e8dcc0") {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.25 + Math.random() * 0.15, size: 3, color, gravity: 220 });
    }
  }

  // Ráfaga de hojas al morir (temática Sherwood, sin sangre/gore).
  function deathBurst(x, y) {
    const leafColors = ["#3fae5a", "#c99b2b", "#7a5e1a", "#2d4a30"];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      spawn({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 60,
        life: 0.6 + Math.random() * 0.4, size: 4 + Math.random() * 3,
        color: leafColors[i % leafColors.length], gravity: 180, shape: "square", spin: (Math.random() - 0.5) * 10,
      });
    }
  }

  // Estela corta al disparar (arco/ballesta).
  function muzzlePuff(x, y, color = "#c9a227") {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      spawn({ x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.2, size: 2.5, color, gravity: 0, shape: "circle" });
    }
  }

  // Polvo de pasos (opcional, sutil) — usado para el jugador local al moverse.
  function dust(x, y, color = "rgba(232,220,192,0.25)") {
    spawn({ x, y, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 10, life: 0.35, size: 2, color, gravity: -10, shape: "circle" });
  }

  function update(dt) {
    items = items.filter((p) => p.life > 0);
    for (const p of items) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
  }

  function draw(ctx, worldToScreen) {
    for (const p of items) {
      const s = worldToScreen(p.x, p.y);
      const alpha = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(s.x, s.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  function clear() {
    items = [];
  }

  return { spawn, hitSpark, deathBurst, muzzlePuff, dust, update, draw, clear };
})();
