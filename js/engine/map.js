/**
 * engine/map.js
 * Arena fija "Claro de Sherwood". Sin tiles complejos: el mapa es una lista de
 * obstáculos rectangulares (árboles/rocas) sobre un fondo de pasto dibujado
 * proceduralmente. Bloquean tanto el movimiento como los proyectiles.
 */

const GameMap = (() => {
  const WIDTH = 1200;
  const HEIGHT = 800;

  // Puntos de spawn, uno por esquina, con margen del borde.
  const SPAWNS = [
    { x: 90, y: 90 },
    { x: WIDTH - 90, y: 90 },
    { x: 90, y: HEIGHT - 90 },
    { x: WIDTH - 90, y: HEIGHT - 90 },
  ];

  // Obstáculos: {x,y,w,h,type} — x,y es la esquina superior izquierda.
  const OBSTACLES = [
    { x: 550, y: 350, w: 100, h: 100, type: "rock" },
    { x: 220, y: 180, w: 50, h: 50, type: "tree" },
    { x: 930, y: 180, w: 50, h: 50, type: "tree" },
    { x: 220, y: 570, w: 50, h: 50, type: "tree" },
    { x: 930, y: 570, w: 50, h: 50, type: "tree" },
    { x: 420, y: 120, w: 40, h: 40, type: "tree" },
    { x: 740, y: 120, w: 40, h: 40, type: "tree" },
    { x: 420, y: 640, w: 40, h: 40, type: "tree" },
    { x: 740, y: 640, w: 40, h: 40, type: "tree" },
    { x: 130, y: 380, w: 60, h: 60, type: "rock" },
    { x: 1010, y: 380, w: 60, h: 60, type: "rock" },
  ];

  function clampToBounds(x, y, radius) {
    return {
      x: Math.max(radius, Math.min(WIDTH - radius, x)),
      y: Math.max(radius, Math.min(HEIGHT - radius, y)),
    };
  }

  // Resuelve colisión círculo (jugador) vs rectángulos (obstáculos).
  // Devuelve una posición corregida que no penetra ningún obstáculo.
  function resolveCircleCollision(x, y, radius) {
    let px = x, py = y;
    for (const ob of OBSTACLES) {
      const closestX = Math.max(ob.x, Math.min(px, ob.x + ob.w));
      const closestY = Math.max(ob.y, Math.min(py, ob.y + ob.h));
      const dx = px - closestX;
      const dy = py - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = radius - dist;
        px += (dx / dist) * overlap;
        py += (dy / dist) * overlap;
      }
    }
    return clampToBounds(px, py, radius);
  }

  // Para proyectiles: ¿este punto choca con algún obstáculo?
  function pointBlocked(x, y) {
    if (x < 0 || y < 0 || x > WIDTH || y > HEIGHT) return true;
    for (const ob of OBSTACLES) {
      if (x >= ob.x && x <= ob.x + ob.w && y >= ob.y && y <= ob.y + ob.h) return true;
    }
    return false;
  }

  // --- Textura de pasto precalculada una sola vez (rendimiento) ---
  const grassCanvas = document.createElement("canvas");
  grassCanvas.width = WIDTH;
  grassCanvas.height = HEIGHT;
  (function buildGrassTexture() {
    const g = grassCanvas.getContext("2d");
    const grad = g.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, WIDTH * 0.75);
    grad.addColorStop(0, "#345c39");
    grad.addColorStop(1, "#1f3323");
    g.fillStyle = grad;
    g.fillRect(0, 0, WIDTH, HEIGHT);

    // Parches irregulares más claros/oscuros para dar variedad orgánica.
    let seed = 1337;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 90; i++) {
      const x = rand() * WIDTH, y = rand() * HEIGHT, r = 20 + rand() * 50;
      g.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.05)";
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Briznas de pasto sueltas.
    g.strokeStyle = "rgba(80,140,80,0.18)";
    g.lineWidth = 1.5;
    for (let i = 0; i < 500; i++) {
      const x = rand() * WIDTH, y = rand() * HEIGHT;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand() - 0.5) * 4, y - 5 - rand() * 5);
      g.stroke();
    }
  })();

  function drawShadow(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.92, w / 2, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(ctx, cameraX, cameraY, viewW, viewH) {
    ctx.drawImage(grassCanvas, -cameraX, -cameraY);

    // Borde del claro (empalizada tosca)
    ctx.strokeStyle = "#0f1a12";
    ctx.lineWidth = 10;
    ctx.strokeRect(-cameraX, -cameraY, WIDTH, HEIGHT);
    ctx.strokeStyle = "rgba(201,162,39,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-cameraX + 4, -cameraY + 4, WIDTH - 8, HEIGHT - 8);

    // Obstáculos, ordenados por Y para dar sensación de profundidad.
    const visible = OBSTACLES
      .map((ob) => ({ ...ob, sx: ob.x - cameraX, sy: ob.y - cameraY }))
      .filter((ob) => ob.sx + ob.w > -20 && ob.sx < viewW + 20 && ob.sy + ob.h > -20 && ob.sy < viewH + 20)
      .sort((a, b) => a.y - b.y);

    for (const ob of visible) {
      const { sx, sy, w, h } = ob;
      if (ob.type === "tree") {
        drawShadow(ctx, sx, sy, w, h * 1.4);
        // tronco
        const trunkGrad = ctx.createLinearGradient(sx, sy, sx + w, sy);
        trunkGrad.addColorStop(0, "#2a1c13");
        trunkGrad.addColorStop(1, "#4a3220");
        ctx.fillStyle = trunkGrad;
        ctx.fillRect(sx + w / 2 - 4, sy + h / 2, 8, h / 2 + 6);
        // copa: varias capas para dar volumen
        const cx = sx + w / 2, cy = sy + h / 2;
        const canopyGrad = ctx.createRadialGradient(cx - w * 0.15, cy - w * 0.15, w * 0.1, cx, cy, w * 0.62);
        canopyGrad.addColorStop(0, "#3f6b46");
        canopyGrad.addColorStop(0.7, "#254a2c");
        canopyGrad.addColorStop(1, "#132a18");
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.58, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - w * 0.25, cy - h * 0.2, w * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + w * 0.28, cy - h * 0.1, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(10,20,12,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        drawShadow(ctx, sx, sy, w, h);
        const rockGrad = ctx.createLinearGradient(sx, sy, sx, sy + h);
        rockGrad.addColorStop(0, "#7a776b");
        rockGrad.addColorStop(1, "#4a4840");
        ctx.fillStyle = rockGrad;
        ctx.beginPath();
        ctx.moveTo(sx + w * 0.1, sy + h);
        ctx.lineTo(sx, sy + h * 0.45);
        ctx.lineTo(sx + w * 0.35, sy);
        ctx.lineTo(sx + w * 0.75, sy + h * 0.05);
        ctx.lineTo(sx + w, sy + h * 0.5);
        ctx.lineTo(sx + w * 0.85, sy + h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#2f2e28";
        ctx.lineWidth = 2;
        ctx.stroke();
        // brillo superior
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx + w * 0.35, sy + 2);
        ctx.lineTo(sx + w * 0.7, sy + h * 0.1);
        ctx.stroke();
      }
    }
  }

  return { WIDTH, HEIGHT, SPAWNS, OBSTACLES, resolveCircleCollision, pointBlocked, clampToBounds, draw };
})();
