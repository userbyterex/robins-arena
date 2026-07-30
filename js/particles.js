/**
 * particles.js — Visual juice: muzzle flash, hit sparks, death bursts,
 * streak particles, dust, explosions.
 */

var Particles = (function () {
  var particles = [];
  var MAX = 400;

  function spawn(opts) {
    if (particles.length >= MAX) return;
    opts = opts || {};
    particles.push({
      x: opts.x || 0,
      y: opts.y || 0,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      life: opts.life || 1,
      maxLife: opts.life || 1,
      size: opts.size || 3,
      color: opts.color || "#fff",
      gravity: opts.gravity != null ? opts.gravity : 0,
      shape: opts.shape || "circle",
      fade: opts.fade !== false,
      grow: opts.grow || false
    });
  }

  function update(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      if (p.grow) p.size += dt * 10;
    }
  }

  function draw(ctx, worldToScreen) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var s = worldToScreen(p.x, p.y);
      var alpha = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(s.x, s.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(s.x - p.size / 2, s.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  function dust(x, y, color) {
    for (var i = 0; i < 4; i++) {
      spawn({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 15 - 5,
        life: 0.3 + Math.random() * 0.2,
        size: 2 + Math.random() * 2,
        color: color || "rgba(200,190,170,0.3)",
        gravity: -10
      });
    }
  }

  function explosion(x, y, color, count) {
    count = count || 12;
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 30 + Math.random() * 80;
      spawn({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        color: color || "#e8dcc0",
        gravity: 20
      });
    }
  }

  function muzzlePuff(x, y) {
    spawn({ x: x, y: y, vx: 0, vy: 0, life: 0.06, size: 35, color: "rgba(255,240,200,0.4)", gravity: 0, shape: "circle", fade: true });
    for (var i = 0; i < 5; i++) {
      var a = Math.random() * Math.PI * 2;
      spawn({
        x: x, y: y,
        vx: Math.cos(a) * 20,
        vy: Math.sin(a) * 20 - 10,
        life: 0.2 + Math.random() * 0.15,
        size: 3 + Math.random() * 4,
        color: "rgba(200,200,200,0.25)",
        gravity: -5
      });
    }
  }

  function hitSpark(x, y) {
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 40 + Math.random() * 60;
      spawn({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.15 + Math.random() * 0.1,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.5 ? "#ffcc66" : "#ff8844",
        gravity: 30
      });
    }
    spawn({ x: x, y: y, vx: 0, vy: 0, life: 0.2, size: 12, color: "rgba(209,58,53,0.2)", gravity: 0, shape: "circle" });
  }

  function deathBurst(x, y) {
    explosion(x, y, "#e8dcc0", 20);
    explosion(x, y, "#c9a227", 10);
    spawn({ x: x, y: y, vx: 0, vy: 0, life: 0.4, size: 5, color: "rgba(201,162,39,0.5)", gravity: 0, shape: "circle", grow: true });
  }

  function streakBurst(x, y) {
    for (var i = 0; i < 15; i++) {
      var a = Math.random() * Math.PI * 2;
      spawn({
        x: x, y: y,
        vx: Math.cos(a) * (30 + Math.random() * 50),
        vy: Math.sin(a) * (30 + Math.random() * 50) - 20,
        life: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color: "#c9a227",
        gravity: -15
      });
    }
  }

  return {
    spawn: spawn,
    update: update,
    draw: draw,
    dust: dust,
    explosion: explosion,
    muzzlePuff: muzzlePuff,
    hitSpark: hitSpark,
    deathBurst: deathBurst,
    streakBurst: streakBurst
  };
})();
