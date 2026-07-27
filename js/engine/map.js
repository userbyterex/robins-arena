/**
 * engine/map.js — Viral conquest arena (Camp vs Castle).
 * Open lanes so NPCs don't stick. Bold visuals.
 */
var GameMap = (function () {
  var WIDTH = 1600;
  var HEIGHT = 900;

  var SPAWNS = [
    { x: 110, y: 180, team: 0 },
    { x: 110, y: 720, team: 0 },
    { x: WIDTH - 110, y: 180, team: 1 },
    { x: WIDTH - 110, y: 720, team: 1 },
  ];

  var OBSTACLES = [
    { x: 60, y: 340, w: 48, h: 48, type: "tree" },
    { x: 220, y: 100, w: 42, h: 42, type: "tree" },
    { x: 220, y: 760, w: 42, h: 42, type: "tree" },
    { x: 320, y: 280, w: 50, h: 50, type: "rock" },
    { x: 320, y: 580, w: 50, h: 50, type: "rock" },
    { x: 700, y: 80, w: 64, h: 64, type: "crate" },
    { x: 840, y: 80, w: 64, h: 64, type: "crate" },
    { x: 700, y: 760, w: 64, h: 64, type: "crate" },
    { x: 840, y: 760, w: 64, h: 64, type: "crate" },
    { x: 560, y: 200, w: 48, h: 48, type: "crate" },
    { x: 1000, y: 200, w: 48, h: 48, type: "crate" },
    { x: 560, y: 660, w: 48, h: 48, type: "crate" },
    { x: 1000, y: 660, w: 48, h: 48, type: "crate" },
    { x: 1300, y: 60, w: 36, h: 220, type: "wall" },
    { x: 1300, y: 620, w: 36, h: 220, type: "wall" },
    { x: 1420, y: 300, w: 70, h: 36, type: "wall" },
    { x: 1420, y: 564, w: 70, h: 36, type: "wall" },
    { x: 1340, y: 120, w: 50, h: 50, type: "crate" },
    { x: 1340, y: 730, w: 50, h: 50, type: "crate" },
  ];

  var TOWERS = [
    { id: "camp_n", x: 190, y: 110, team: 0, range: 230, damage: 12, cooldown: 1.0 },
    { id: "camp_s", x: 190, y: 790, team: 0, range: 230, damage: 12, cooldown: 1.0 },
    { id: "castle_n", x: 1410, y: 110, team: 1, range: 230, damage: 12, cooldown: 1.0 },
    { id: "castle_s", x: 1410, y: 790, team: 1, range: 230, damage: 12, cooldown: 1.0 },
  ];

  var FLAGS = [
    { id: "nymphs", name: "Nymphs Grove", x: 400, y: 450, radius: 72, team: -1 },
    { id: "village", name: "Village", x: 800, y: 450, radius: 78, team: -1 },
    { id: "outpost", name: "Outpost", x: 1200, y: 450, radius: 72, team: -1 },
    { id: "camp_hq", name: "Camp HQ", x: 130, y: 450, radius: 58, team: 0 },
    { id: "castle_hq", name: "Castle HQ", x: 1470, y: 450, radius: 58, team: 1 },
  ];

  function clampToBounds(x, y, radius) {
    return {
      x: Math.max(radius, Math.min(WIDTH - radius, x)),
      y: Math.max(radius, Math.min(HEIGHT - radius, y)),
    };
  }

  function resolveCircleCollision(x, y, radius) {
    var px = x, py = y;
    for (var pass = 0; pass < 3; pass++) {
      for (var i = 0; i < OBSTACLES.length; i++) {
        var ob = OBSTACLES[i];
        var closestX = Math.max(ob.x, Math.min(px, ob.x + ob.w));
        var closestY = Math.max(ob.y, Math.min(py, ob.y + ob.h));
        var dx = px - closestX;
        var dy = py - closestY;
        var distSq = dx * dx + dy * dy;
        if (distSq < radius * radius) {
          var dist = Math.sqrt(distSq);
          if (dist < 0.0001) {
            var left = px - ob.x;
            var right = ob.x + ob.w - px;
            var top = py - ob.y;
            var bot = ob.y + ob.h - py;
            var m = Math.min(left, right, top, bot);
            if (m === left) px = ob.x - radius - 0.5;
            else if (m === right) px = ob.x + ob.w + radius + 0.5;
            else if (m === top) py = ob.y - radius - 0.5;
            else py = ob.y + ob.h + radius + 0.5;
          } else {
            var overlap = radius - dist + 0.5;
            px += (dx / dist) * overlap;
            py += (dy / dist) * overlap;
          }
        }
      }
    }
    return clampToBounds(px, py, radius);
  }

  function tryMove(x, y, dx, dy, radius) {
    var target = resolveCircleCollision(x + dx, y + dy, radius);
    var moved = Math.hypot(target.x - x, target.y - y);
    var want = Math.hypot(dx, dy);
    if (moved > want * 0.35) return target;
    var sx = resolveCircleCollision(x + dx, y, radius);
    if (Math.abs(sx.x - x) > Math.abs(dx) * 0.35) return sx;
    var sy = resolveCircleCollision(x, y + dy, radius);
    if (Math.abs(sy.y - y) > Math.abs(dy) * 0.35) return sy;
    var nx = -dy * 0.6;
    var ny = dx * 0.6;
    var a = resolveCircleCollision(x + dx + nx, y + dy + ny, radius);
    if (Math.hypot(a.x - x, a.y - y) > moved) return a;
    var b = resolveCircleCollision(x + dx - nx, y + dy - ny, radius);
    if (Math.hypot(b.x - x, b.y - y) > moved) return b;
    return target;
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
    var left = g.createLinearGradient(0, 0, WIDTH * 0.48, 0);
    left.addColorStop(0, "#0d1f14");
    left.addColorStop(0.5, "#163320");
    left.addColorStop(1, "#1c3a26");
    g.fillStyle = left;
    g.fillRect(0, 0, WIDTH * 0.5, HEIGHT);
    var right = g.createLinearGradient(WIDTH * 0.52, 0, WIDTH, 0);
    right.addColorStop(0, "#1e2830");
    right.addColorStop(0.5, "#171e26");
    right.addColorStop(1, "#10161c");
    g.fillStyle = right;
    g.fillRect(WIDTH * 0.5, 0, WIDTH * 0.5, HEIGHT);
    var road = g.createLinearGradient(WIDTH * 0.42, 0, WIDTH * 0.58, 0);
    road.addColorStop(0, "rgba(0,0,0,0)");
    road.addColorStop(0.35, "rgba(201,162,39,0.08)");
    road.addColorStop(0.5, "rgba(201,162,39,0.14)");
    road.addColorStop(0.65, "rgba(201,162,39,0.08)");
    road.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = road;
    g.fillRect(WIDTH * 0.4, 0, WIDTH * 0.2, HEIGHT);
    g.fillStyle = "rgba(90,160,220,0.04)";
    g.fillRect(0, HEIGHT * 0.38, WIDTH, HEIGHT * 0.24);
    var seed = 4242;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    g.strokeStyle = "rgba(255,255,255,0.03)";
    g.lineWidth = 1;
    for (var gx = 0; gx < WIDTH; gx += 48) {
      g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, HEIGHT); g.stroke();
    }
    for (var gy = 0; gy < HEIGHT; gy += 48) {
      g.beginPath(); g.moveTo(0, gy); g.lineTo(WIDTH, gy); g.stroke();
    }
    for (var n = 0; n < 140; n++) {
      g.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.025)";
      g.beginPath();
      g.arc(rand() * WIDTH, rand() * HEIGHT, 8 + rand() * 28, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(255,140,40,0.05)";
    g.beginPath(); g.arc(130, 450, 90, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(90,140,220,0.05)";
    g.beginPath(); g.arc(1470, 450, 90, 0, Math.PI * 2); g.fill();
  })();

  function drawTree(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.95, w / 2, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(sx + w / 2 - 5, sy + h / 2, 10, h / 2 + 4);
    var cx = sx + w / 2, cy = sy + h * 0.38;
    ctx.fillStyle = "#1e4a28";
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2d6b38";
    ctx.beginPath(); ctx.arc(cx - 8, cy - 8, w * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(120,200,100,0.15)";
    ctx.beginPath(); ctx.arc(cx + 4, cy - 4, w * 0.2, 0, Math.PI * 2); ctx.fill();
  }

  function drawRock(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.92, w / 2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    var g = ctx.createLinearGradient(sx, sy, sx + w, sy + h);
    g.addColorStop(0, "#6a6860");
    g.addColorStop(1, "#3a3830");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.1, sy + h);
    ctx.lineTo(sx, sy + h * 0.45);
    ctx.lineTo(sx + w *
return {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    SPAWNS: SPAWNS,
    OBSTACLES: OBSTACLES,
    TOWERS: TOWERS,
    FLAGS: FLAGS,
    resolveCircleCollision: resolveCircleCollision,
    tryMove: tryMove,
    pointBlocked: pointBlocked,
    draw: draw,
  };
})();
