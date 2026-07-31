/**
 * engine/map.js — Compact rectangular Sherwood arena (1600×900).
 * With integration logging.
 */
var GameMap = (function () {
  console.log("[GameMap] loading…");

  var WIDTH = 1600;
  var HEIGHT = 900;

  var SPAWNS = [
    { x: 120, y: 280, team: 0 },
    { x: 1480, y: 280, team: 1 },
    { x: 120, y: 620, team: 0 },
    { x: 1480, y: 620, team: 1 }
  ];

  var FLAGS = [
    { id: "camp_hq", name: "Camp HQ", x: 100, y: 450, radius: 48, team: 0 },
    { id: "castle_hq", name: "Castle HQ", x: 1500, y: 450, radius: 48, team: 1 },
    { id: "nymphs", name: "Nymphs", x: 520, y: 280, radius: 44, team: -1 },
    { id: "village", name: "Village", x: 800, y: 450, radius: 48, team: -1 },
    { id: "outpost", name: "Outpost", x: 1080, y: 620, radius: 44, team: -1 }
  ];

  var TOWERS = [
    { id: "t1", x: 260, y: 450, range: 150, damage: 12, cooldown: 1.2, team: 0 },
    { id: "t2", x: 1340, y: 450, range: 150, damage: 12, cooldown: 1.2, team: 1 }
  ];

  var OBSTACLES = [];
  (function buildObstacles() {
    var i;
    for (i = 0; i < 12; i++) {
      OBSTACLES.push({
        type: "tree",
        x: 40 + (i % 4) * 55,
        y: 60 + Math.floor(i / 4) * 280,
        w: 32, h: 32
      });
    }
    for (i = 0; i < 12; i++) {
      OBSTACLES.push({
        type: "tree",
        x: 1380 + (i % 4) * 50,
        y: 60 + Math.floor(i / 4) * 280,
        w: 32, h: 32
      });
    }
    var rocks = [
      [400, 120], [700, 100], [1000, 130],
      [450, 780], [750, 800], [1050, 770],
      [650, 450], [950, 420]
    ];
    for (i = 0; i < rocks.length; i++) {
      OBSTACLES.push({ type: "rock", x: rocks[i][0], y: rocks[i][1], w: 36, h: 28 });
    }
    var props = [
      [480, 350], [560, 240], [760, 380], [840, 520],
      [1040, 560], [1120, 680], [300, 450], [1280, 450]
    ];
    for (i = 0; i < props.length; i++) {
      OBSTACLES.push({
        type: i % 2 ? "crate" : "barrel",
        x: props[i][0], y: props[i][1],
        w: 24, h: 24
      });
    }
    OBSTACLES.push({ type: "wall", x: 180, y: 380, w: 70, h: 16 });
    OBSTACLES.push({ type: "wall", x: 180, y: 500, w: 70, h: 16 });
    OBSTACLES.push({ type: "wall", x: 1350, y: 380, w: 70, h: 16 });
    OBSTACLES.push({ type: "wall", x: 1350, y: 500, w: 70, h: 16 });
    console.log("[GameMap] obstacles:", OBSTACLES.length);
  })();

  var floorCanvas = document.createElement("canvas");
  floorCanvas.width = WIDTH;
  floorCanvas.height = HEIGHT;
  (function paintFloor() {
    var fctx = floorCanvas.getContext("2d");
    if (!fctx) {
      console.error("[GameMap] no 2d context for floor");
      return;
    }
    fctx.fillStyle = "#2d4a30";
    fctx.fillRect(0, 0, WIDTH, HEIGHT);
    var i;
    for (i = 0; i < 280; i++) {
      fctx.fillStyle = i % 2 ? "rgba(45,90,50,0.35)" : "rgba(30,60,35,0.28)";
      fctx.beginPath();
      fctx.arc(Math.random() * WIDTH, Math.random() * HEIGHT, 16 + Math.random() * 40, 0, Math.PI * 2);
      fctx.fill();
    }
    fctx.strokeStyle = "rgba(90,70,40,0.28)";
    fctx.lineWidth = 36;
    fctx.beginPath();
    fctx.moveTo(100, 450);
    fctx.quadraticCurveTo(520, 320, 800, 450);
    fctx.quadraticCurveTo(1080, 580, 1500, 450);
    fctx.stroke();
    fctx.fillStyle = "rgba(61,158,88,0.1)";
    fctx.fillRect(0, 0, 280, HEIGHT);
    fctx.fillStyle = "rgba(90,140,200,0.1)";
    fctx.fillRect(WIDTH - 280, 0, 280, HEIGHT);
    console.log("[GameMap] floor painted", WIDTH + "x" + HEIGHT);
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
      if (o.type === "bush") continue;
      if (!rectHitsCircle(o.x, o.y, o.w, o.h, x, y, radius)) continue;
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
    var r1 = resolveCircleCollision(x + dx, y, radius);
    return resolveCircleCollision(r1.x, y + dy, radius);
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
    ctx.arc(sx + w / 2 - 3, sy + h * 0.28, w * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, sx, sy, w, h) {
    ctx.fillStyle = "#6a6e72";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a8e92";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 - 3, sy + h / 2 - 2, w / 4, h / 4, 0, 0, Math.PI * 2);
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
    ctx.moveTo(sx + 3, sy + h * 0.3);
    ctx.lineTo(sx + w - 3, sy + h * 0.3);
    ctx.moveTo(sx + 3, sy + h * 0.7);
    ctx.lineTo(sx + w - 3, sy + h * 0.7);
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
    ctx.fillRect(sx - 12, sy - 24, 24, 36);
    ctx.fillStyle = team === 0 ? "#3d9e58" : "#5a8ec8";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 42);
    ctx.lineTo(sx + 14, sy - 24);
    ctx.lineTo(sx - 14, sy - 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = team === 0 ? "rgba(61,158,88,0.12)" : "rgba(90,140,200,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 150, 0, Math.PI * 2);
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
      ctx.arc(sx, sy, f.radius + 5, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#e8eef4";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(f.name, sx, sy - f.radius - 8);
    if (live && live.structureHp != null && live.structureMax) {
      var pct = live.structureHp / live.structureMax;
      ctx.fillStyle = "#0a0c0e";
      ctx.fillRect(sx - 28, sy + f.radius + 5, 56, 6);
      ctx.fillStyle = pct > 0.35 ? (team === 0 ? "#3d9e58" : "#5a8ec8") : "#d13a35";
      ctx.fillRect(sx - 28, sy + f.radius + 5, 56 * pct, 6);
    }
  }

  var _drawCount = 0;
  function draw(ctx, cameraX, cameraY, viewW, viewH, extra) {
    if (!ctx) {
      console.error("[GameMap.draw] no ctx");
      return;
    }
    try {
      ctx.drawImage(floorCanvas, -cameraX, -cameraY);
      ctx.strokeStyle = "#0a0e10";
      ctx.lineWidth = 12;
      ctx.strokeRect(-cameraX, -cameraY, WIDTH, HEIGHT);

      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(61,158,88,0.35)";
      ctx.fillText("CAMP", 120 - cameraX, 40 - cameraY);
      ctx.fillStyle = "rgba(90,140,200,0.35)";
      ctx.fillText("CASTLE", WIDTH - 120 - cameraX, 40 - cameraY);

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

      _drawCount++;
      if (_drawCount === 1 || _drawCount % 300 === 0) {
        console.log("[GameMap.draw] ok #" + _drawCount, "cam", Math.round(cameraX), Math.round(cameraY));
      }
    } catch (err) {
      console.error("[GameMap.draw] ERROR", err);
    }
  }

  console.log("[GameMap] ready", WIDTH + "x" + HEIGHT, "flags", FLAGS.length, "towers", TOWERS.length);

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
