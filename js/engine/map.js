/**
 * engine/map.js — Textured 1600×900 Sherwood arena.
 * Trees, rocks, bushes, crates, towers, team tints.
 */
var GameMap = (function () {
  console.log("[GameMap] loading improved…");

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
    for (i = 0; i < 14; i++) {
      OBSTACLES.push({
        type: "tree",
        x: 35 + (i % 5) * 48 + (i % 3) * 4,
        y: 50 + Math.floor(i / 5) * 260 + (i % 2) * 20,
        w: 34, h: 34
      });
    }
    for (i = 0; i < 14; i++) {
      OBSTACLES.push({
        type: "tree",
        x: 1360 + (i % 5) * 44,
        y: 50 + Math.floor(i / 5) * 260,
        w: 34, h: 34
      });
    }
    [[600, 180], [900, 200], [750, 700], [1050, 720]].forEach(function (p) {
      OBSTACLES.push({ type: "tree", x: p[0], y: p[1], w: 30, h: 30 });
    });
    [[400, 120], [700, 100], [1000, 130], [450, 780], [750, 800], [1050, 770], [650, 450], [950, 420]].forEach(function (p) {
      OBSTACLES.push({ type: "rock", x: p[0], y: p[1], w: 36, h: 28 });
    });
    [[500, 500], [850, 300], [1100, 480], [350, 600], [1200, 350], [700, 550]].forEach(function (p) {
      OBSTACLES.push({ type: "bush", x: p[0], y: p[1], w: 28, h: 22 });
    });
    [[480, 350], [560, 240], [760, 380], [840, 520], [1040, 560], [1120, 680], [300, 450], [1280, 450]].forEach(function (p, idx) {
      OBSTACLES.push({ type: idx % 2 ? "crate" : "barrel", x: p[0], y: p[1], w: 24, h: 24 });
    });
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
    if (!fctx) return;

    fctx.fillStyle = "#2a4830";
    fctx.fillRect(0, 0, WIDTH, HEIGHT);

    var i;
    for (i = 0; i < 320; i++) {
      fctx.fillStyle = i % 3 === 0 ? "rgba(50,100,55,0.35)" : i % 3 === 1 ? "rgba(28,55,32,0.3)" : "rgba(60,110,65,0.2)";
      fctx.beginPath();
      fctx.arc(Math.random() * WIDTH, Math.random() * HEIGHT, 12 + Math.random() * 48, 0, Math.PI * 2);
      fctx.fill();
    }
    for (i = 0; i < 40; i++) {
      fctx.fillStyle = "rgba(90,70,40,0.18)";
      fctx.beginPath();
      fctx.ellipse(Math.random() * WIDTH, Math.random() * HEIGHT, 30 + Math.random() * 50, 18 + Math.random() * 30, Math.random(), 0, Math.PI * 2);
      fctx.fill();
    }
    for (i = 0; i < 20; i++) {
      fctx.fillStyle = "rgba(0,0,0,0.04)";
      fctx.fillRect(0, i * 45, WIDTH, 18);
    }

    fctx.strokeStyle = "rgba(100,78,45,0.32)";
    fctx.lineWidth = 38;
    fctx.lineCap = "round";
    fctx.beginPath();
    fctx.moveTo(100, 450);
    fctx.quadraticCurveTo(520, 320, 800, 450);
    fctx.quadraticCurveTo(1080, 580, 1500, 450);
    fctx.stroke();
    fctx.strokeStyle = "rgba(120,95,55,0.15)";
    fctx.lineWidth = 22;
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
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 + 3, sy + h * 0.92, w * 0.45, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(sx + w * 0.38, sy + h * 0.48, w * 0.24, h * 0.5);
    ctx.fillStyle = "#6b4a28";
    ctx.fillRect(sx + w * 0.4, sy + h * 0.5, w * 0.1, h * 0.45);
    ctx.fillStyle = "#1e5a2c";
    ctx.beginPath();
    ctx.arc(sx + w / 2, sy + h * 0.38, w * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2e7a3c";
    ctx.beginPath();
    ctx.arc(sx + w / 2 - 4, sy + h * 0.3, w * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d9e50";
    ctx.beginPath();
    ctx.arc(sx + w / 2 + 3, sy + h * 0.26, w * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 + 2, sy + h * 0.85, w * 0.45, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a5e62";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a7e82";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 - 4, sy + h / 2 - 4, w / 4, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a4e52";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 + 5, sy + h / 2 + 3, w / 5, h / 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBush(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h * 0.9, w * 0.5, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d6b3a";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8f4e";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 - 4, sy + h / 2 - 2, w / 3, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4aaa5a";
    ctx.beginPath();
    ctx.arc(sx + w * 0.35, sy + h * 0.35, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrate(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(sx + 2, sy + h - 2, w, 4);
    ctx.fillStyle = "#8b6914";
    ctx.fillRect(sx, sy, w, h);
    ctx.fillStyle = "#a08020";
    ctx.fillRect(sx + 2, sy + 2, w - 4, 4);
    ctx.strokeStyle = "#5c450c";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, w, h);
    ctx.beginPath();
    ctx.moveTo(sx, sy + h / 2);
    ctx.lineTo(sx + w, sy + h / 2);
    ctx.stroke();
  }

  function drawBarrel(ctx, sx, sy, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 + 1, sy + h * 0.9, w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a4a28";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9a6a40";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 - 2, sy + h / 2 - 3, w / 4, h / 4, 0, 0, Math.PI * 2);
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
    ctx.fillStyle = "#5a5e62";
    ctx.fillRect(sx + 2, sy + 2, w - 4, 3);
    ctx.strokeStyle = "#2a2e32";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, w, h);
  }

  function drawTower(ctx, sx, sy, team) {
    var col = team === 0 ? "#3d5c40" : "#3d4a5c";
    var accent = team === 0 ? "#3d9e58" : "#5a8ec8";
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(sx + 2, sy + 8, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.fillRect(sx - 12, sy - 26, 24, 38);
    ctx.fillStyle = accent;
    ctx.fillRect(sx - 10, sy - 24, 20, 4);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 44);
    ctx.lineTo(sx + 15, sy - 26);
    ctx.lineTo(sx - 15, sy - 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 44);
    ctx.lineTo(sx, sy - 54);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 54);
    ctx.lineTo(sx + 10, sy - 50);
    ctx.lineTo(sx, sy - 46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = team === 0 ? "rgba(61,158,88,0.1)" : "rgba(90,140,200,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 150, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawFlagZone(ctx, sx, sy, f, live) {
    var team = live && live.team != null ? live.team : f.team;
    var progress = live && live.progress != null ? live.progress : 0;
    var col = team === 0 ? "rgba(61,158,88,0.32)" : team === 1 ? "rgba(90,140,200,0.32)" : "rgba(200,200,200,0.18)";
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
    if (!ctx) return;
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
        if (sx + ob.w < -50 || sy + ob.h < -50 || sx > viewW + 50 || sy > viewH + 50) continue;
        if (ob.type === "tree") drawTree(ctx, sx, sy, ob.w, ob.h);
        else if (ob.type === "rock") drawRock(ctx, sx, sy, ob.w, ob.h);
        else if (ob.type === "bush") drawBush(ctx, sx, sy, ob.w, ob.h);
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
        console.log("[GameMap.draw] #" + _drawCount);
      }
    } catch (err) {
      console.error("[GameMap.draw]", err);
    }
  }

  console.log("[GameMap] ready", WIDTH + "x" + HEIGHT);
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
