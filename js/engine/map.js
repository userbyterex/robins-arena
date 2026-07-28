    ctx.fillStyle = team === 0 ? "#3d9e58" : "#5a8ec8";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 58);
    ctx.lineTo(sx + 12, sy - 52);
    ctx.lineTo(sx, sy - 46);
    ctx.closePath();
    ctx.fill();
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
    ctx.strokeStyle = team === 0 ? "rgba(61,158,88,0.2)" : team === 1 ? "rgba(90,140,200,0.2)" : "rgba(200,200,200,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, f.radius * 0.6, 0, Math.PI * 2);
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
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 32, sy + f.radius + 6, 64, 7);
    }
  }

  function draw(ctx, cameraX, cameraY, viewW, viewH, extra) {
    ctx.drawImage(floorCanvas, -cameraX, -cameraY);
    ctx.strokeStyle = "#0a0e10";
    ctx.lineWidth = 14;
    ctx.strokeRect(-cameraX, -cameraY, WIDTH, HEIGHT);
    ctx.strokeStyle = "rgba(201,162,39,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-cameraX + 6, -cameraY + 6, WIDTH - 12, HEIGHT - 12);
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(61,158,88,0.25)";
    ctx.fillText("CAMP", 180 - cameraX, 50 - cameraY);
    ctx.fillStyle = "rgba(90,140,200,0.25)";
    ctx.fillText("CASTLE", WIDTH - 180 - cameraX, 50 - cameraY);

    for (var i = 0; i < OBSTACLES.length; i++) {
      var ob = OBSTACLES[i];
      var sx = ob.x - cameraX;
      var sy = ob.y - cameraY;
      if (sx + ob.w < -30 || sy + ob.h < -30 || sx > viewW + 30 || sy > viewH + 30) continue;
      switch (ob.type) {
        case "tree": drawTree(ctx, sx, sy, ob.w, ob.h, ob.variant || 0); break;
        case "rock": drawRock(ctx, sx, sy, ob.w, ob.h, ob.variant || 0); break;
        case "crate": drawCrate(ctx, sx, sy, ob.w, ob.h, ob.variant || 0); break;
        case "wall": drawWall(ctx, sx, sy, ob.w, ob.h, ob.variant || 0); break;
        case "fence": drawFence(ctx, sx, sy, ob.w, ob.h, ob.variant || 0); break;
        case "bush": drawBush(ctx, sx, sy, ob.w, ob.h, ob.variant || 0); break;
        case "water": drawWater(ctx, sx, sy, ob.w, ob.h); break;
        case "barrel": drawBarrel(ctx, sx, sy, ob.w, ob.h); break;
      }
    }

    for (var t = 0; t < TOWERS.length; t++) {
      var tw = TOWERS[t];
      drawTower(ctx, tw.x - cameraX, tw.y - cameraY, tw.team);
    }

    var liveFlags = (extra && extra.flags) ? extra.flags : [];
    for (var f = 0; f < FLAGS.length; f++) {
      var flag = FLAGS[f];
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
    draw: draw,
  };
})();
