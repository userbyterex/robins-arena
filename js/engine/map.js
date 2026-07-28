/**
 * engine/map.js — Complete conquest map (Camp vs Castle) — ENHANCED.
 * Richer visuals: detailed trees, rocks, grass, paths, water, fences, flowers.
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
    { x: 60, y: 340, w: 48, h: 48, type: "tree", variant: 0 },
    { x: 220, y: 100, w: 42, h: 42, type: "tree", variant: 1 },
    { x: 220, y: 760, w: 42, h: 42, type: "tree", variant: 0 },
    { x: 480, y: 200, w: 52, h: 52, type: "tree", variant: 2 },
    { x: 480, y: 680, w: 46, h: 46, type: "tree", variant: 1 },
    { x: 1120, y: 220, w: 50, h: 50, type: "tree", variant: 0 },
    { x: 1120, y: 660, w: 44, h: 44, type: "tree", variant: 2 },
    { x: 1380, y: 340, w: 48, h: 48, type: "tree", variant: 1 },
    { x: 1380, y: 560, w: 42, h: 42, type: "tree", variant: 0 },
    { x: 800, y: 120, w: 40, h: 40, type: "tree", variant: 1 },
    { x: 800, y: 780, w: 44, h: 44, type: "tree", variant: 2 },
    { x: 320, y: 450, w: 38, h: 38, type: "tree", variant: 0 },
    { x: 1280, y: 450, w: 40, h: 40, type: "tree", variant: 1 },
    { x: 320, y: 280, w: 50, h: 50, type: "rock", variant: 0 },
    { x: 320, y: 580, w: 50, h: 50, type: "rock", variant: 1 },
    { x: 1280, y: 280, w: 44, h: 44, type: "rock", variant: 0 },
    { x: 1280, y: 580, w: 48, h: 48, type: "rock", variant: 1 },
    { x: 600, y: 450, w: 36, h: 36, type: "rock", variant: 0 },
    { x: 1000, y: 450, w: 40, h: 40, type: "rock", variant: 1 },
    { x: 700, y: 80, w: 64, h: 64, type: "crate", variant: 0 },
    { x: 840, y: 80, w: 64, h: 64, type: "crate", variant: 1 },
    { x: 700, y: 760, w: 64, h: 64, type: "crate", variant: 0 },
    { x: 840, y: 760, w: 64, h: 64, type: "crate", variant: 1 },
    { x: 560, y: 200, w: 48, h: 48, type: "crate", variant: 0 },
    { x: 1000, y: 200, w: 48, h: 48, type: "crate", variant: 1 },
    { x: 560, y: 660, w: 48, h: 48, type: "crate", variant: 1 },
    { x: 1000, y: 660, w: 48, h: 48, type: "crate", variant: 0 },
    { x: 1300, y: 60, w: 36, h: 220, type: "wall", variant: 0 },
    { x: 1300, y: 620, w: 36, h: 220, type: "wall", variant: 1 },
    { x: 1420, y: 300, w: 70, h: 36, type: "wall", variant: 0 },
    { x: 1420, y: 564, w: 70, h: 36, type: "wall", variant: 1 },
    { x: 1340, y: 120, w: 50, h: 50, type: "crate", variant: 0 },
    { x: 1340, y: 730, w: 50, h: 50, type: "crate", variant: 1 },
    { x: 180, y: 300, w: 80, h: 8, type: "fence", variant: 0 },
    { x: 180, y: 600, w: 80, h: 8, type: "fence", variant: 1 },
    { x: 1340, y: 300, w: 80, h: 8, type: "fence", variant: 0 },
    { x: 1340, y: 600, w: 80, h: 8, type: "fence", variant: 1 },
    { x: 420, y: 380, w: 32, h: 32, type: "bush", variant: 0 },
    { x: 420, y: 500, w: 28, h: 28, type: "bush", variant: 1 },
    { x: 1150, y: 380, w: 30, h: 30, type: "bush", variant: 0 },
    { x: 1150, y: 520, w: 34, h: 34, type: "bush", variant: 1 },
    { x: 750, y: 350, w: 26, h: 26, type: "bush", variant: 0 },
    { x: 850, y: 550, w: 28, h: 28, type: "bush", variant: 1 },
    { x: 780, y: 420, w: 40, h: 60, type: "water", variant: 0 },
    { x: 620, y: 320, w: 24, h: 24, type: "barrel", variant: 0 },
    { x: 960, y: 580, w: 24, h: 24, type: "barrel", variant: 0 },
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
        if (ob.type === "water") continue;
        var closestX = Math.max(ob.x, Math.min(px, ob.x + ob.w));
        var closestY = Math.max(ob.y, Math.min(py, ob.y + ob.h));
        var dx = px - closestX;
        var dy = py - closestY;
        var dist = Math.hypot(dx, dy);
        if (dist < radius && dist > 0.001) {
          var overlap = radius - dist + 0.5;
          px += (dx / dist) * overlap;
          py += (dy / dist) * overlap;
        } else if (dist < 0.001) {
          px += radius;
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
      if (ob.type === "water") continue;
      if (x >= ob.x && x <= ob.x + ob.w && y >= ob.y && y <= ob.y + ob.h) return true;
    }
    return false;
  }

  var floorCanvas = document.createElement("canvas");
  floorCanvas.width = WIDTH;
  floorCanvas.height = HEIGHT;
  (function buildFloor() {
    var g = floorCanvas.getContext("2d");

    var leftGrad = g.createLinearGradient(0, 0, WIDTH * 0.48, 0);
    leftGrad.addColorStop(0, "#0d1f14");
    leftGrad.addColorStop(0.3, "#143320");
    leftGrad.addColorStop(0.6, "#1a3a24");
    leftGrad.addColorStop(1, "#1e4228");
    g.fillStyle = leftGrad;
    g.fillRect(0, 0, WIDTH * 0.5, HEIGHT);

    var rightGrad = g.createLinearGradient(WIDTH * 0.52, 0, WIDTH, 0);
    rightGrad.addColorStop(0, "#1e2830");
    rightGrad.addColorStop(0.4, "#1a2228");
    rightGrad.addColorStop(0.7, "#171e26");
    rightGrad.addColorStop(1, "#10161c");
    g.fillStyle = rightGrad;
    g.fillRect(WIDTH * 0.5, 0, WIDTH * 0.5, HEIGHT);

    var roadGrad = g.createLinearGradient(WIDTH * 0.42, 0, WIDTH * 0.58, 0);
    roadGrad.addColorStop(0, "rgba(0,0,0,0)");
    roadGrad.addColorStop(0.3, "rgba(139,119,71,0.12)");
    roadGrad.addColorStop(0.5, "rgba(160,140,90,0.18)");
    roadGrad.addColorStop(0.7, "rgba(139,119,71,0.12)");
    roadGrad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = roadGrad;
    g.fillRect(WIDTH * 0.38, 0, WIDTH * 0.24, HEIGHT);

    g.strokeStyle = "rgba(180,160,100,0.06)";
    g.lineWidth = 1;
    for (var py = 40; py < HEIGHT; py += 80) {
      g.beginPath();
      g.moveTo(WIDTH * 0.40, py);
      g.lineTo(WIDTH * 0.42, py + 20);
      g.lineTo(WIDTH * 0.44, py + 10);
      g.stroke();
    }

    var seed = 4242;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

    for (var n = 0; n < 200; n++) {
      var rx = rand() * WIDTH;
      var ry = rand() * HEIGHT;
      var isLeft = rx < WIDTH * 0.5;
      g.fillStyle = isLeft
        ? (rand() > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(60,120,60,0.04)")
        : (rand() > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(80,100,120,0.04)");
      g.beginPath();
      g.arc(rx, ry, 6 + rand() * 32, 0, Math.PI * 2);
      g.fill();
    }

    for (var m = 0; m < 80; m++) {
      var lx = rand() * WIDTH;
      var ly = rand() * HEIGHT;
      g.fillStyle = "rgba(255,255,255,0.02)";
      g.beginPath();
      g.arc(lx, ly, 4 + rand() * 16, 0, Math.PI * 2);
      g.fill();
    }

    var flowerColors = ["#c9a227", "#d4a5a5", "#7dcea0", "#e8dcc0", "#c99b2b"];
    for (var fi = 0; fi < 60; fi++) {
      var fx = rand() * WIDTH;
      var fy = rand() * HEIGHT;
      if (fx > WIDTH * 0.40 && fx < WIDTH * 0.60) continue;
      g.fillStyle = flowerColors[Math.floor(rand() * flowerColors.length)];
      g.globalAlpha = 0.4 + rand() * 0.3;
      g.beginPath();
      g.arc(fx, fy, 1.5 + rand() * 2, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    g.fillStyle = "rgba(100,80,50,0.15)";
    g.beginPath();
    g.moveTo(50, 440);
    g.lineTo(80, 410);
    g.lineTo(110, 440);
    g.closePath();
    g.fill();
    var glow = g.createRadialGradient(80, 480, 0, 80, 480, 25);
    glow.addColorStop(0, "rgba(200,120,40,0.12)");
    glow.addColorStop(1, "rgba(200,120,40,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(80, 480, 25, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = "rgba(90,140,200,0.2)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(WIDTH - 80, 420);
    g.lineTo(WIDTH - 80, 460);
    g.stroke();
    g.fillStyle = "rgba(90,140,200,0.15)";
    g.fillRect(WIDTH - 80, 420, 18, 14);
  })();

  function drawTree(ctx, sx, sy, w, h, variant) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.95, w / 2, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1c10";
    var trunkW = 8 + (variant % 2) * 2;
    ctx.fillRect(sx + w / 2 - trunkW / 2, sy + h * 0.45, trunkW, h * 0.5);
    ctx.fillStyle = "#3d2a18";
    ctx.fillRect(sx + w / 2 - trunkW / 2 + 1, sy + h * 0.45, 2, h * 0.5);
    var cx = sx + w / 2, cy = sy + h * 0.35;
    var r = w * 0.55;
    ctx.fillStyle = variant === 2 ? "#1a3a22" : "#1e4a28";
    ctx.beginPath(); ctx.arc(cx, cy + 4, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = variant === 2 ? "#235232" : "#2d6b38";
    ctx.beginPath(); ctx.arc(cx - 3, cy - 2, r * 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = variant === 2 ? "#2d7040" : "#3a8a4a";
    ctx.beginPath(); ctx.arc(cx - 6, cy - 8, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = variant === 2 ? "rgba(45,112,64,0.6)" : "rgba(58,138,74,0.5)";
    ctx.beginPath(); ctx.arc(cx + 6, cy + 2, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  function drawRock(ctx, sx, sy, w, h, variant) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.92, w / 2, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = variant === 1 ? "#5a5850" : "#4a4840";
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.1, sy + h);
    ctx.lineTo(sx, sy + h * 0.45);
    ctx.lineTo(sx + w * 0.3, sy);
    ctx.lineTo(sx + w * 0.7, sy + h * 0.15);
    ctx.lineTo(sx + w, sy + h * 0.5);
    ctx.lineTo(sx + w * 0.85, sy + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = variant === 1 ? "#6a6860" : "#5a5850";
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.3, sy);
    ctx.lineTo(sx + w * 0.7, sy + h * 0.15);
    ctx.lineTo(sx + w * 0.5, sy + h * 0.35);
    ctx.lineTo(sx + w * 0.2, sy + h * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(60,100,50,0.3)";
    ctx.beginPath();
    ctx.arc(sx + w * 0.3, sy + h * 0.2, w * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrate(ctx, sx, sy, w, h, variant) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(sx + 2, sy + h - 3, w, 5);
    ctx.fillStyle = variant === 1 ? "#7a5a28" : "#8a6a30";
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = variant === 1 ? "#5a4018" : "#6a5018";
    ctx.lineWidth = 1;
    for (var ly = sy + 8; ly < sy + h; ly += 10) {
      ctx.beginPath();
      ctx.moveTo(sx + 2, ly);
      ctx.lineTo(sx + w - 2, ly);
      ctx.stroke();
    }
    ctx.strokeStyle = variant === 1 ? "#4a3010" : "#5a4018";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, w, h);
    ctx.beginPath();
    ctx.moveTo(sx, sy + h / 2);
    ctx.lineTo(sx + w, sy + h / 2);
    ctx.stroke();
    ctx.fillStyle = "#3a3020";
    ctx.fillRect(sx - 1, sy - 1, 6, 6);
    ctx.fillRect(sx + w - 5, sy - 1, 6, 6);
    ctx.fillRect(sx - 1, sy + h - 5, 6, 6);
    ctx.fillRect(sx + w - 5, sy + h - 5, 6, 6);
  }

  function drawWall(ctx, sx, sy, w, h, variant) {
    ctx.fillStyle = variant === 1 ? "#2a3540" : "#3a4550";
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = "#1a2028";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, w, h);
    var brickH = 10;
    for (var by = sy + brickH; by < sy + h; by += brickH) {
      ctx.beginPath();
      ctx.moveTo(sx, by);
      ctx.lineTo(sx + w, by);
      ctx.stroke();
      var offset = ((by - sy) / brickH % 2 === 0) ? w / 2 : 0;
      ctx.beginPath();
      ctx.moveTo(sx + offset, by - brickH);
      ctx.lineTo(sx + offset, by);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(60,100,50,0.25)";
    ctx.fillRect(sx, sy, w, 4);
  }

  function drawFence(ctx, sx, sy, w, h, variant) {
    ctx.fillStyle = variant === 1 ? "#5a4020" : "#6a5028";
    var posts = Math.floor(w / 16);
    for (var p = 0; p <= posts; p++) {
      var px = sx + (p / posts) * w;
      ctx.fillRect(px - 2, sy - 4, 4, h + 8);
    }
    ctx.fillRect(sx, sy + 1, w, 2);
    ctx.fillRect(sx, sy + h - 3, w, 2);
  }

  function drawBush(ctx, sx, sy, w, h, variant) {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.9, w / 2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    var baseColor = variant === 1 ? "#1e4a28" : "#2a5a32";
    var lightColor = variant === 1 ? "#2d6b38" : "#3a7a42";
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(sx + w / 2, sy + h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(sx + w * 0.35, sy + h * 0.35, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(200,220,100,0.15)";
    ctx.beginPath();
    ctx.arc(sx + w * 0.6, sy + h * 0.3, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWater(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(60,100,140,0.35)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(100,160,200,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(150,200,230,0.15)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 - 3, sy + h / 2 + 2, w / 2 - 6, h / 2 - 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBarrel(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.92, w / 2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a4020";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.15, w / 2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx, sy + h * 0.15, w, h * 0.7);
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.85, w / 2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a4a4a";
    ctx.fillRect(sx - 1, sy + h * 0.3, w + 2, 3);
    ctx.fillRect(sx - 1, sy + h * 0.65, w + 2, 3);
    ctx.fillStyle = "#c9a227";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("!", sx + w / 2, sy + h / 2 + 3);
  }

  function drawTower(ctx, sx, sy, team) {
    ctx.fillStyle = team === 0 ? "#2d6a4f" : "#2c4a6e";
    ctx.fillRect(sx - 14, sy - 24, 28, 36);
    ctx.strokeStyle = team === 0 ? "#1d4a35" : "#1c3a5e";
    ctx.lineWidth = 1;
    for (var by = sy - 20; by < sy + 10; by += 8) {
      ctx.beginPath();
      ctx.moveTo(sx - 14, by);
      ctx.lineTo(sx + 14, by);
      ctx.stroke();
    }
    ctx.fillStyle = team === 0 ? "#40916c" : "#4a7ab0";
    ctx.beginPath();
    ctx.moveTo(sx - 18, sy - 24);
    ctx.lineTo(sx, sy - 44);
    ctx.lineTo(sx + 18, sy - 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = team === 0 ? "#50a17c" : "#5a8ac0";
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 28);
    ctx.lineTo(sx, sy - 40);
    ctx.lineTo(sx + 2, sy - 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8a7a5a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 44);
    ctx.lineTo(sx, sy - 58);
    ctx.stroke();
    ctx.fillStyle = team === 0 ? "#3d9e58" : "#5a8ec8";

  
