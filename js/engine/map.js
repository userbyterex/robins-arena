/**
 * engine/map.js — Sherwood conquest map (complete, self-contained).
 */
var GameMap = (function () {
  var WIDTH = 3000;
  var HEIGHT = 1000;

  var SPAWNS = [
    { x: 200, y: 300, team: 0 },
    { x: 2800, y: 300, team: 1 },
    { x: 200, y: 700, team: 0 },
    { x: 2800, y: 700, team: 1 }
  ];

  var FLAGS = [
    { id: "camp_hq", name: "Camp HQ", x: 150, y: 500, radius: 60, team: 0 },
    { id: "castle_hq", name: "Castle HQ", x: 2850, y: 500, radius: 60, team: 1 },
    { id: "nymphs", name: "Nymphs", x: 1000, y: 300, radius: 55, team: -1 },
    { id: "village", name: "Village", x: 1500, y: 500, radius: 55, team: -1 },
    { id: "outpost", name: "Outpost", x: 2000, y: 700, radius: 55, team: -1 }
  ];

  var TOWERS = [
    { id: "t1", x: 400, y: 500, range: 180, damage: 12, cooldown: 1.2, team: 0 },
    { id: "t2", x: 2600, y: 500, range: 180, damage: 12, cooldown: 1.2, team: 1 }
  ];

  // Simple obstacles
  var OBSTACLES = [];
  (function buildObstacles() {
    var i, x, y;
    // Trees left forest
    for (i = 0; i < 18; i++) {
      OBSTACLES.push({
        type: "tree",
        x: 80 + (i % 6) * 90 + Math.random() * 20,
        y: 80 + Math.floor(i / 6) * 280 + Math.random() * 40,
        w: 36, h: 36
      });
    }
    // Trees right
    for (i = 0; i < 18; i++) {
      OBSTACLES.push({
        type: "tree",
        x: 2400 + (i % 6) * 90,
        y: 80 + Math.floor(i / 6) * 280,
        w: 36, h: 36
      });
    }
    // Rocks mid
    for (i = 0; i < 10; i++) {
      OBSTACLES.push({
        type: "rock",
        x: 700 + i * 160,
        y: 120 + (i % 2) * 700,
        w: 40, h: 32
      });
    }
    // Crates / barrels near zones
    var spots = [
      [950, 400], [1050, 250], [1480, 420], [1550, 580],
      [1950, 650], [2050, 750], [600, 500], [2400, 500]
    ];
    for (i = 0; i < spots.length; i++) {
      OBSTACLES.push({
        type: i % 2 ? "crate" : "barrel",
        x: spots[i][0], y: spots[i][1],
        w: 28, h: 28
      });
    }
    // Walls near HQs
    OBSTACLES.push({ type: "wall", x: 300, y: 420, w: 80, h: 20 });
    OBSTACLES.push({ type: "wall", x: 300, y: 560, w: 80, h: 20 });
    OBSTACLES.push({ type: "wall", x: 2620, y: 420, w: 80, h: 20 });
    OBSTACLES.push({ type: "wall", x: 2620, y: 560, w: 80, h: 20 });
  })();

  // Floor cache
  var floorCanvas = document.createElement("canvas");
  floorCanvas.width = WIDTH;
  floorCanvas.height = HEIGHT;
  (function paintFloor() {
    var fctx = floorCanvas.getContext("2d");
    // Base grass
    fctx.fillStyle = "#2d4a30";
    fctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Noise patches
    var i;
    for (i = 0; i < 400; i++) {
      fctx.fillStyle = i % 2 ? "rgba(45,90,50,0.35)" : "rgba(30,60,35,0.3)";
      fctx.beginPath();
      fctx.arc(Math.random() * WIDTH, Math.random() * HEIGHT, 20 + Math.random() * 50, 0, Math.PI * 2);
      fctx.fill();
    }
    // Paths
    fctx.strokeStyle = "rgba(90,70,40,0.25)";
    fctx.lineWidth = 40;
    fctx.beginPath();
    fctx.moveTo(150, 500);
    fctx.quadraticCurveTo(1000, 400, 1500, 500);
    fctx.quadraticCurveTo(2000, 600, 2850, 500);
    fctx.stroke();
    // Team tint
    fctx.fillStyle = "rgba(61,158,88,0.08)";
    fctx.fillRect(0, 0, 500, HEIGHT);
    fctx.fillStyle = "rgba(90,140,200,0.08)";
    fctx.fillRect(WIDTH - 500, 0, 500, HEIGHT);
  })();

  function rectHitsCircle(rx, ry, rw, rh, cx, cy, cr) {
    var closestX = Math.max(rx, Math.min(cx, rx + rw));
    var closestY = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - closestX;
    var dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  function resolveCircleCollision(x, y, radius) {
    x = Math.max(radius, Math.min(WIDTH - radius, x));
    y = Math.max(radius, Math.min(HEIGHT - radius, y));
    for (var i = 0; i < OBSTACLES.length; i++) {
      var o = OBSTACLES[i];
      if (o.type === "bush") continue; // soft
      if (!rectHitsCircle(o.x, o.y, o.w, o.h, x, y, radius)) continue;
      // Push out (simple)
      var ox = o.x + o.w / 2;
      var oy = o.y + o.h / 2;
      var dx = x - ox;
      var dy = y - oy;
      var len = Math.hypot(dx, dy) || 1;
      var push = radius + Math.max(o.w, o.h) * 0.45 - len;
      if (push > 0) {
        x += (dx / len) * push;
        y += (dy / len) * push;
      }
    }
    x = Math.max(radius, Math.min(WIDTH - radius, x));
    y = Math.max(radius, Math.min(HEIGHT - radius, y));
    return { x: x, y: y };
  }

  function tryMove(x, y, dx, dy, radius) {
    var nx = x + dx;
    var ny = y + dy;
    var r1 = resolveCircleCollision(nx, y, radius);
    var r2 = resolveCircleCollision(r1.x, ny, radius);
    return r2;
  }

  function pointBlocked(px, py) {
    if (px < 0 || py < 0 || px > WIDTH || py > HEIGHT) return true;
    for (var i = 0; i < OBSTACLES.length; i++) {
      var o = OBSTACLES[i];
      if (o.type === "bush") continue;
      if (px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h) return true;
    }
    return false;
  }

  function drawTree(ctx, sx, sy, w, h) {
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(sx + w * 0.35, sy + h * 0.45, w * 0.3, h * 0.55);
    ctx.fillStyle = "#2e6b3a";
    ctx.beginPath();
    ctx.arc(sx + w / 2, sy + h * 0.35, w * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8f4e";
    ctx.beginPath();
    ctx.arc(sx + w / 2 - 4, sy + h * 0.28, w * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, sx, sy, w, h) {
    ctx.fillStyle = "#6a6e72";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a8e92";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 - 4, sy + h / 2 - 3, w / 4, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrate(ctx, sx, sy, w, h) {
    ctx.fillStyle = "#8b6914";
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = "#5c450c";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, w, h);
    ctx.beginPath();
    ctx.moveTo(sx, sy + h / 2);
    ctx.lineTo(sx + w, sy + h / 2);
    ctx.stroke();
  }

  function drawBarrel(ctx, sx, sy, w, h) {
    ctx.fillStyle = "#7a4a28";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3d2410";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy + h * 0.3);
    ctx.lineTo(sx + w - 4, sy + h * 0.3);
    ctx.moveTo(sx + 4, sy + h * 0.7);
    ctx.lineTo(sx + w - 4, sy + h * 0.7);
    ctx.stroke();
  }

  function drawWall(ctx, sx, sy, w, h) {
    ctx.fillStyle = "#4a4e52";
    ctx.fillRect(sx, sy, w, h);
    ctx.strokeStyle = "#2a2e32";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, w, h);
  }

  function drawTower(ctx, sx, sy, team) {
    ctx.fillStyle = team === 0 ? "#3d5c40" : "#3d4a5c";
    ctx.fillRect(sx - 14, sy - 28, 28, 40);
    ctx.fillStyle = team === 0 ? "#3d9e58" : "#5a8ec8";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 48);
    ctx.lineTo(sx + 16, sy - 28);
    ctx.lineTo(sx - 16, sy - 28);
    ctx.closePath();
    ctx.fill();
    // Range hint
    ctx.strokeStyle = team === 0 ? "rgba(61,158,88,0.15)" : "rgba(90,140,200,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 180, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawFlagZone(ctx, sx, sy, f, live) {
    var team = live && live.team != null ? live.team : f.team;
    var progress = live && live.progress != null ? live.progress : 0;
    var col = team === 0 ? "rgba(61,158,88,0.35)" : team === 1 ? "rgba(90,140,200,0.35)" : "rgba(200,200,200,0.2)";
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(sx, sy, f.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = team === 0 ? "#3d9e58" : team === 1 ? "#5a8ec8" : "#888";
    ctx.lineWidth = 3;
    ctx.stroke();
    if (progress > 0 && progress < 1) {
      ctx.strokeStyle = "#f0c040";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, f.radius + 6, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#e8eef4";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(f.name, sx, sy - f.radius - 10);
    if (live && live.structureHp != null && live.structureMax) {
      var pct = live.structureHp / live.structureMax;
      ctx.fillStyle = "#0a0c0e";
      ctx.fillRect(sx - 32, sy + f.radius + 6, 64, 7);
      ctx.fillStyle = pct > 0.35 ? (team === 0 ? "#3d9e58" : "#5a8ec8") : "#d13a35";
      ctx.fillRect(sx - 32, sy + f.radius + 6, 64 * pct, 7);
    }
  }

  function draw(ctx, cameraX, cameraY, viewW, viewH, extra) {
    ctx.drawImage(floorCanvas, -cameraX, -cameraY);
    ctx.strokeStyle = "#0a0e10";
    ctx.lineWidth = 14;
    ctx.strokeRect(-cameraX, -cameraY, WIDTH, HEIGHT);

    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(61,158,88,0.3)";
    ctx.fillText("CAMP", 180 - cameraX, 50 - cameraY);
    ctx.fillStyle = "rgba(90,140,200,0.3)";
    ctx.fillText("CASTLE", WIDTH - 180 - cameraX, 50 - cameraY);

    var i, ob, sx, sy;
    for (i = 0; i < OBSTACLES.length; i++) {
      ob = OBSTACLES[i];
      sx = ob.x - cameraX;
      sy = ob.y - cameraY;
      if (sx + ob.w < -40 || sy + ob.h < -40 || sx > viewW + 40 || sy > viewH + 40) continue;
      if (ob.type === "tree") drawTree(ctx, sx, sy, ob.w, ob.h);
      else if (ob.type === "rock") drawRock(ctx, sx, sy, ob.w, ob.h);
      else if (ob.type === "crate") drawCrate(ctx, sx, sy, ob.w, ob.h);
      else if (ob.type === "barrel") drawBarrel(ctx, sx, sy, ob.w, ob.h);
      else if (ob.type === "wall") drawWall(ctx, sx, sy, ob.w, ob.h);
    }

    for (i = 0; i < TOWERS.length; i++) {
      var tw = TOWERS[i];
      drawTower(ctx, tw.x - cameraX, tw.y - cameraY, tw.team);
    }

    var liveFlags = (extra && extra.flags) ? extra.flags : [];
    for (i = 0; i < FLAGS.length; i++) {
      var flag = FLAGS[i];
      var live = null;
      for (var li = 0; li < liveFlags.length; li++) {
        if (liveFlags[li].id === flag.id) { live = liveFlags[li]; break; }
      }
      drawFlagZone(ctx, flag.x - cameraX, flag.y - cameraY, flag, live);
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
    tryMove: tryMove,
    pointBlocked: pointBlocked,
    draw: draw
  };
})();
