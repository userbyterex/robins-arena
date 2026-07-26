/**
 * engine/map.js — Conquest map: Forest Camp (left) vs Castle (right).
 * Capture zones + towers. No template literals (paste-safe).
 */
var GameMap = (function () {
  var WIDTH = 1600;
  var HEIGHT = 900;

  var SPAWNS = [
    { x: 120, y: 200, team: 0 },
    { x: 120, y: 700, team: 0 },
    { x: WIDTH - 120, y: 200, team: 1 },
    { x: WIDTH - 120, y: 700, team: 1 },
  ];

  var OBSTACLES = [
    { x: 80, y: 380, w: 50, h: 50, type: "tree" },
    { x: 250, y: 150, w: 45, h: 45, type: "tree" },
    { x: 250, y: 700, w: 45, h: 45, type: "tree" },
    { x: 380, y: 420, w: 55, h: 55, type: "rock" },
    { x: 720, y: 200, w: 70, h: 70, type: "crate" },
    { x: 810, y: 630, w: 70, h: 70, type: "crate" },
    { x: 650, y: 450, w: 60, h: 60, type: "crate" },
    { x: 900, y: 450, w: 60, h: 60, type: "crate" },
    { x: 1280, y: 80, w: 40, h: 200, type: "wall" },
    { x: 1280, y: 620, w: 40, h: 200, type: "wall" },
    { x: 1400, y: 350, w: 80, h: 40, type: "wall" },
    { x: 1400, y: 510, w: 80, h: 40, type: "wall" },
    { x: 1320, y: 150, w: 55, h: 55, type: "crate" },
    { x: 1320, y: 700, w: 55, h: 55, type: "crate" },
  ];

  var TOWERS = [
    { id: "camp_n", x: 200, y: 120, team: 0, range: 220, damage: 12, cooldown: 1.1 },
    { id: "camp_s", x: 200, y: 780, team: 0, range: 220, damage: 12, cooldown: 1.1 },
    { id: "castle_n", x: 1400, y: 120, team: 1, range: 220, damage: 12, cooldown: 1.1 },
    { id: "castle_s", x: 1400, y: 780, team: 1, range: 220, damage: 12, cooldown: 1.1 },
  ];

  var FLAGS = [
    { id: "nymphs", name: "Nymphs Grove", x: 400, y: 450, radius: 70, team: -1 },
    { id: "village", name: "Village", x: 800, y: 450, radius: 80, team: -1 },
    { id: "outpost", name: "Outpost", x: 1200, y: 450, radius: 70, team: -1 },
    { id: "camp_hq", name: "Camp HQ", x: 140, y: 450, radius: 60, team: 0 },
    { id: "castle_hq", name: "Castle HQ", x: 1460, y: 450, radius: 60, team: 1 },
  ];

  function clampToBounds(x, y, radius) {
    return {
      x: Math.max(radius, Math.min(WIDTH - radius, x)),
      y: Math.max(radius, Math.min(HEIGHT - radius, y)),
    };
  }

  function resolveCircleCollision(x, y, radius) {
    var px = x, py = y;
    for (var i = 0; i < OBSTACLES.length; i++) {
      var ob = OBSTACLES[i];
      var closestX = Math.max(ob.x, Math.min(px, ob.x + ob.w));
      var closestY = Math.max(ob.y, Math.min(py, ob.y + ob.h));
      var dx = px - closestX;
      var dy = py - closestY;
      var distSq = dx * dx + dy * dy;
      if (distSq < radius * radius) {
        var dist = Math.sqrt(distSq) || 0.001;
        var overlap = radius - dist;
        px += (dx / dist) * overlap;
        py += (dy / dist) * overlap;
      }
    }
    return clampToBounds(px, py, radius);
  }

  function pointBlocked(x, y) {
    if (x < 0 || y < 0 || x > WIDTH || y > HEIGHT) return true;
    for (var i = 0; i < OBSTACLES.length; i++) {
      var ob = OBSTACLES[i];
      if (x >= ob.x && x <= ob.x + ob.w && y >= ob.y && y <= ob.y + ob.h) return true;
    }
    return false;
  }

  var floorCanvas = document.createElement("canvas");
  floorCanvas.width = WIDTH;
  floorCanvas.height = HEIGHT;
  (function buildFloor() {
    var g = floorCanvas.getContext("2d");
    var left = g.createLinearGradient(0, 0, WIDTH * 0.45, 0);
    left.addColorStop(0, "#1a3020");
    left.addColorStop(1, "#243828");
    g.fillStyle = left;
    g.fillRect(0, 0, WIDTH * 0.5, HEIGHT);
    var right = g.createLinearGradient(WIDTH * 0.55, 0, WIDTH, 0);
    right.addColorStop(0, "#2a3034");
    right.addColorStop(1, "#1e2428");
    g.fillStyle = right;
    g.fillRect(WIDTH * 0.5, 0, WIDTH * 0.5, HEIGHT);
    g.fillStyle = "rgba(80,70,50,0.35)";
    g.fillRect(WIDTH * 0.42, 0, WIDTH * 0.16, HEIGHT);

    var seed = 9001;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    g.strokeStyle = "rgba(255,255,255,0.025)";
    g.lineWidth = 1;
    for (var gx = 0; gx < WIDTH; gx += 40) {
      g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, HEIGHT); g.stroke();
    }
    for (var gy = 0; gy < HEIGHT; gy += 40) {
      g.beginPath(); g.moveTo(0, gy); g.lineTo(WIDTH, gy); g.stroke();
    }
    for (var n = 0; n < 100; n++) {
      g.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.02)";
      g.beginPath();
      g.arc(rand() * WIDTH, rand() * HEIGHT, 10 + rand() * 30, 0, Math.PI * 2);
      g.fill();
    }
  })();

  function drawTree(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.95, w / 2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(sx + w / 2 - 5, sy + h / 2, 10, h / 2 + 4);
    var cx = sx + w / 2, cy = sy + h * 0.4;
    ctx.fillStyle = "#2d5a34";
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a6e40";
    ctx.beginPath(); ctx.arc(cx - 8, cy - 6, w * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  function drawRock(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.9, w / 2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a5850";
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.1, sy + h);
    ctx.lineTo(sx, sy + h * 0.45);
    ctx.lineTo(sx + w * 0.35, sy);
    ctx.lineTo(sx + w * 0.8, sy + h * 0.1);
    ctx.lineTo(sx + w, sy + h * 0.55);
    ctx.lineTo(sx + w * 0.85, sy + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2f2e28";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawCrate(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(sx + 3, sy + 3, w, h);
    var g = ctx.createLinearGradient(sx, sy, sx, sy + h);
    g.addColorStop(0, "#6b5a3e");
    g.addColorStop(1, "#3e3424");
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = "#2a2218";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, w - 2, h - 2);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(sx + 2, sy + h / 2);
    ctx.lineTo(sx + w - 2, sy + h / 2);
    ctx.stroke();
  }

  function drawWall(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(sx + 2, sy + 2, w, h);
    var g = ctx.createLinearGradient(sx, sy, sx + w, sy + h);
    g.addColorStop(0, "#5a6068");
    g.addColorStop(1, "#2e3438");
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = "#1a1e22";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 0.5, sy + 0.5, w - 1, h - 1);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(sx + 1, sy + 1, w - 2, 3);
  }

  function drawTower(ctx, sx, sy, team) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 18, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = team === 0 ? "#3a5a30" : "#4a4e58";
    ctx.fillRect(sx - 14, sy - 28, 28, 40);
    ctx.fillStyle = team === 0 ? "#2d8a40" : "#6a7080";
    ctx.beginPath();
    ctx.moveTo(sx - 18, sy - 28);
    ctx.lineTo(sx, sy - 48);
    ctx.lineTo(sx + 18, sy - 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(sx - 4, sy - 12, 8, 8);
  }

  function drawFlagZone(ctx, sx, sy, radius, team, name, progress) {
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    if (team === 0) ctx.strokeStyle = "rgba(61,158,88,0.55)";
    else if (team === 1) ctx.strokeStyle = "rgba(90,140,200,0.55)";
    else ctx.strokeStyle = "rgba(200,200,200,0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    if (team === 0) ctx.fillStyle = "rgba(61,158,88,0.1)";
    else if (team === 1) ctx.fillStyle = "rgba(90,140,200,0.1)";
    else ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.strokeStyle = "#c8b890";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 8);
    ctx.lineTo(sx, sy - 28);
    ctx.stroke();
    if (team === 0) ctx.fillStyle = "#3d9e58";
    else if (team === 1) ctx.fillStyle = "#5a8ec8";
    else ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 28);
    ctx.lineTo(sx + 18, sy - 22);
    ctx.lineTo(sx, sy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.font = "12px VT323, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(232,238,244,0.7)";
    ctx.fillText(name, sx, sy + radius + 14);
    if (progress != null && progress > 0 && progress < 1) {
      ctx.beginPath();
      ctx.arc(sx, sy, radius - 6, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = "#f0c040";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  function draw(ctx, cameraX, cameraY, viewW, viewH, extra) {
    ctx.drawImage(floorCanvas, -cameraX, -cameraY);

    ctx.strokeStyle = "#0a0e10";
    ctx.lineWidth = 14;
    ctx.strokeRect(-cameraX, -cameraY, WIDTH, HEIGHT);

    ctx.font = "18px Cinzel, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(61,158,88,0.25)";
    ctx.fillText("CAMP", 180 - cameraX, 40 - cameraY);
    ctx.fillStyle = "rgba(90,140,200,0.25)";
    ctx.fillText("CASTLE", WIDTH - 180 - cameraX, 40 - cameraY);

    var i, ob, sx, sy;
    for (i = 0; i < OBSTACLES.length; i++) {
      ob = OBSTACLES[i];
      sx = ob.x - cameraX;
      sy = ob.y - cameraY;
      if (sx + ob.w < -30 || sx > viewW + 30 || sy + ob.h < -30 || sy > viewH + 30) continue;
      if (ob.type === "tree") drawTree(ctx, sx, sy, ob.w, ob.h);
      else if (ob.type === "rock") drawRock(ctx, sx, sy, ob.w, ob.h);
      else if (ob.type === "crate") drawCrate(ctx, sx, sy, ob.w, ob.h);
      else drawWall(ctx, sx, sy, ob.w, ob.h);
    }

    for (i = 0; i < TOWERS.length; i++) {
      var tw = TOWERS[i];
      drawTower(ctx, tw.x - cameraX, tw.y - cameraY, tw.team);
    }

    var flagStates = (extra && extra.flags) ? extra.flags : FLAGS;
    for (i = 0; i < flagStates.length; i++) {
      var f = flagStates[i];
      drawFlagZone(ctx, f.x - cameraX, f.y - cameraY, f.radius, f.team, f.name, f.progress);
    }
  }

  return {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    SPAWNS: SPAWNS,
    OBSTACLES: OBSTACLES,
    TOWERS: TOWERS,
    FLAGS: FLAGS,
    resolveCircleCollision: resolveCircleCollision,
    pointBlocked: pointBlocked,
    clampToBounds: clampToBounds,
    draw: draw,
  };
})();
