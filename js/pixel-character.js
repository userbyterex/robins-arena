/**
 * pixel-character.js — Unique 56px class sprites.
 * Warrior / Ranger / Mage / Monk with distinct gear.
 */
var PixelCharacter = (function () {
  console.log("[PixelCharacter] loading 56px…");

  var SPRITE_SIZE = 56;
  var cache = new Map();
  var _genCount = 0;

  var SKIN_TONES = [
    "#f5d0a9", "#e8b89a", "#d4a373", "#c68e5f", "#a67c52",
    "#8d5524", "#6f4e37", "#3d2314", "#ffdbac", "#e0ac69"
  ];
  var HAIR_COLORS = [
    "#1a1a1a", "#3d2314", "#6b4226", "#8b6914", "#c9a227",
    "#d4a574", "#e8dcc0", "#8a2be2", "#c0392b", "#2ecc71"
  ];
  var CLOTH_COLORS = [
    "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400",
    "#2c3e50", "#7f8c8d", "#16a085", "#f39c12", "#e74c3c"
  ];

  function shade(hex, amt) {
    if (!hex || hex[0] !== "#") return hex || "#888";
    var num = parseInt(hex.slice(1), 16);
    if (isNaN(num)) return hex;
    var r = Math.max(0, Math.min(255, (num >> 16) + amt));
    var g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
    var b = Math.max(0, Math.min(255, (num & 0xff) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function px(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w || 1, h || 1);
  }

  function getPalette(appearance) {
    return {
      skin: (appearance && appearance.skin) || SKIN_TONES[0],
      hair: (appearance && appearance.hair) || HAIR_COLORS[0],
      cloth: (appearance && appearance.cloth) || CLOTH_COLORS[0]
    };
  }

  function drawLegs(ctx, pal, boot) {
    px(ctx, shade(pal.cloth, -28), 20, 38, 6, 12);
    px(ctx, shade(pal.cloth, -28), 30, 38, 6, 12);
    px(ctx, boot || "#2a1c10", 19, 48, 8, 5);
    px(ctx, boot || "#2a1c10", 29, 48, 8, 5);
    px(ctx, shade(boot || "#2a1c10", 25), 20, 49, 6, 1);
    px(ctx, shade(boot || "#2a1c10", 25), 30, 49, 6, 1);
  }

  function drawHead(ctx, pal, opts) {
    opts = opts || {};
    px(ctx, shade(pal.skin, -12), 24, 16, 8, 4);
    px(ctx, pal.skin, 20, 8, 16, 12);
    px(ctx, shade(pal.skin, 20), 21, 9, 14, 4);
    px(ctx, "#1a120c", 23, 12, 3, 3);
    px(ctx, "#1a120c", 30, 12, 3, 3);
    px(ctx, "#fff", 23, 12, 1, 1);
    px(ctx, "#fff", 30, 12, 1, 1);
    px(ctx, shade(pal.skin, -28), 25, 16, 6, 1);
    if (!opts.noHair) {
      px(ctx, pal.hair, 19, 6, 18, 5);
      px(ctx, shade(pal.hair, 18), 20, 5, 16, 3);
    }
  }

  function drawWarrior(ctx, pal) {
    drawLegs(ctx, pal, "#3a3a3a");
    px(ctx, pal.cloth, 18, 20, 20, 20);
    px(ctx, shade(pal.cloth, 28), 19, 21, 18, 8);
    px(ctx, shade(pal.cloth, -22), 18, 34, 20, 6);
    px(ctx, "#c9a227", 20, 30, 16, 4);
    px(ctx, "#e8d060", 24, 31, 8, 2);
    px(ctx, "#c9a227", 26, 24, 4, 4);
    px(ctx, pal.cloth, 12, 22, 6, 12);
    px(ctx, pal.cloth, 38, 22, 6, 12);
    px(ctx, pal.skin, 12, 33, 6, 4);
    px(ctx, pal.skin, 38, 33, 6, 4);
    px(ctx, shade(pal.cloth, -35), 11, 18, 8, 6);
    px(ctx, shade(pal.cloth, -35), 37, 18, 8, 6);
    px(ctx, "#c9a227", 12, 19, 6, 1);
    px(ctx, "#c9a227", 38, 19, 6, 1);
    drawHead(ctx, pal, { noHair: true });
    px(ctx, "#5a5a5a", 19, 4, 18, 8);
    px(ctx, "#6a6a6a", 20, 3, 16, 4);
    px(ctx, "#7a7a7a", 22, 5, 12, 3);
    px(ctx, "#1a1a1a", 22, 9, 12, 2);
    px(ctx, "#c9a227", 26, 0, 4, 5);
    px(ctx, "#e8d060", 27, 0, 2, 3);
    px(ctx, "#8a6a30", 6, 20, 8, 16);
    px(ctx, "#c9a227", 7, 22, 6, 12);
    px(ctx, "#e8d060", 9, 26, 2, 4);
    px(ctx, pal.cloth, 8, 24, 4, 4);
    px(ctx, "#c0c0c0", 44, 14, 4, 18);
    px(ctx, "#e8e8e8", 45, 14, 2, 16);
    px(ctx, "#c9a227", 43, 30, 6, 3);
    px(ctx, "#5a4020", 44, 33, 4, 5);
  }

  function drawRanger(ctx, pal) {
    drawLegs(ctx, pal, "#2a1c10");
    px(ctx, pal.cloth, 18, 20, 20, 18);
    px(ctx, shade(pal.cloth, 22), 19, 21, 18, 6);
    px(ctx, "#5a4020", 18, 34, 20, 4);
    px(ctx, "#c9a227", 25, 34, 6, 4);
    px(ctx, shade(pal.cloth, -12), 12, 22, 6, 11);
    px(ctx, shade(pal.cloth, -12), 38, 22, 6, 11);
    px(ctx, pal.skin, 12, 32, 6, 4);
    px(ctx, pal.skin, 38, 32, 6, 4);
    px(ctx, shade(pal.cloth, -38), 13, 18, 5, 22);
    px(ctx, shade(pal.cloth, -38), 38, 18, 5, 22);
    drawHead(ctx, pal);
    px(ctx, shade(pal.cloth, -18), 17, 3, 22, 10);
    px(ctx, pal.cloth, 18, 2, 20, 6);
    px(ctx, shade(pal.cloth, 22), 20, 3, 16, 4);
    px(ctx, shade(pal.cloth, -28), 17, 9, 5, 7);
    px(ctx, shade(pal.cloth, -28), 34, 9, 5, 7);
    px(ctx, "#5a4020", 41, 14, 6, 16);
    px(ctx, "#c9a227", 42, 12, 4, 4);
    px(ctx, "#8b6914", 42, 16, 1, 12);
    px(ctx, "#8b6914", 44, 16, 1, 12);
    px(ctx, "#8b6914", 46, 16, 1, 10);
    px(ctx, "#6b4226", 48, 10, 3, 26);
    px(ctx, "#8b6914", 49, 12, 1, 22);
    px(ctx, "#c9a227", 48, 9, 3, 2);
    px(ctx, "#c9a227", 48, 35, 3, 2);
    ctx.strokeStyle = "rgba(232,220,192,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(49, 11);
    ctx.lineTo(52, 23);
    ctx.lineTo(49, 35);
    ctx.stroke();
  }

  function drawMage(ctx, pal) {
    px(ctx, pal.cloth, 16, 32, 24, 16);
    px(ctx, shade(pal.cloth, 18), 17, 33, 22, 5);
    px(ctx, shade(pal.cloth, -22), 16, 42, 24, 6);
    px(ctx, "#2a1c10", 20, 48, 6, 5);
    px(ctx, "#2a1c10", 30, 48, 6, 5);
    px(ctx, pal.cloth, 18, 18, 20, 16);
    px(ctx, shade(pal.cloth, 22), 19, 19, 18, 7);
    px(ctx, "#9b59b6", 22, 30, 12, 4);
    px(ctx, "#e8d060", 26, 28, 4, 4);
    px(ctx, "#c080e0", 27, 29, 2, 2);
    px(ctx, pal.cloth, 8, 20, 10, 12);
    px(ctx, pal.cloth, 38, 20, 10, 12);
    px(ctx, shade(pal.cloth, -18), 8, 28, 10, 5);
    px(ctx, shade(pal.cloth, -18), 38, 28, 10, 5);
    px(ctx, pal.skin, 10, 31, 5, 4);
    px(ctx, pal.skin, 41, 31, 5, 4);
    drawHead(ctx, pal, { noHair: true });
    px(ctx, pal.cloth, 18, 5, 20, 6);
    px(ctx, shade(pal.cloth, -12), 20, 3, 16, 4);
    px(ctx, shade(pal.cloth, -22), 22, 1, 12, 3);
    px(ctx, shade(pal.cloth, -32), 25, 0, 6, 2);
    px(ctx, "#9b59b6", 18, 9, 20, 2);
    px(ctx, pal.hair, 19, 10, 4, 4);
    px(ctx, pal.hair, 33, 10, 4, 4);
    px(ctx, "#5a4020", 48, 6, 3, 38);
    px(ctx, "#7a60a0", 45, 3, 9, 7);
    px(ctx, "#9a80c0", 46, 2, 7, 4);
    px(ctx, "#e0d0ff", 48, 4, 3, 3);
  }

  function drawMonk(ctx, pal) {
    drawLegs(ctx, pal, "#8a6a40");
    px(ctx, pal.cloth, 18, 20, 20, 18);
    px(ctx, shade(pal.cloth, 24), 19, 21, 18, 7);
    px(ctx, "#3d9e58", 18, 32, 20, 5);
    px(ctx, "#2d7a40", 20, 33, 16, 3);
    px(ctx, "#c9a227", 25, 32, 6, 5);
    px(ctx, shade(pal.cloth, -12), 12, 22, 6, 10);
    px(ctx, shade(pal.cloth, -12), 38, 22, 6, 10);
    px(ctx, pal.skin, 12, 31, 6, 5);
    px(ctx, pal.skin, 38, 31, 6, 5);
    drawHead(ctx, pal);
    px(ctx, pal.hair, 17, 7, 5, 10);
    px(ctx, pal.hair, 34, 7, 5, 10);
    px(ctx, pal.hair, 18, 5, 20, 4);
    px(ctx, "#e8a0a0", 20, 5, 3, 2);
    px(ctx, "#a0e8a0", 33, 5, 3, 2);
    px(ctx, "#e8e8a0", 26, 4, 3, 2);
    px(ctx, "#c9a227", 22, 18, 3, 3);
    px(ctx, "#e8d060", 27, 18, 3, 3);
    px(ctx, "#c9a227", 32, 18, 3, 3);
    px(ctx, "#5a4020", 8, 8, 3, 34);
    px(ctx, "#3d9e58", 5, 4, 9, 7);
    px(ctx, "#2d7a40", 6, 3, 7, 4);
    px(ctx, "#6bcf7a", 8, 5, 4, 3);
  }

  function generate(classId, appearance) {
    var key = (classId || "warrior") + "_" + JSON.stringify(appearance || {});
    if (cache.has(key)) return cache.get(key);

    var canvas = document.createElement("canvas");
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    var ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.imageSmoothingEnabled = false;
    var pal = getPalette(appearance || {});
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

    var id = classId || "warrior";
    switch (id) {
      case "warrior": drawWarrior(ctx, pal); break;
      case "ranger": drawRanger(ctx, pal); break;
      case "mage": drawMage(ctx, pal); break;
      case "monk":
      case "healer": drawMonk(ctx, pal); break;
      default: drawWarrior(ctx, pal); break;
    }

    cache.set(key, canvas);
    _genCount++;
    if (_genCount <= 6 || _genCount % 20 === 0) {
      console.log("[PixelCharacter] gen #" + _genCount, id);
    }
    return canvas;
  }

  console.log("[PixelCharacter] ready —", SPRITE_SIZE + "px");
  return {
    generate: generate,
    getSkinTones: function () { return SKIN_TONES.slice(); },
    getHairColors: function () { return HAIR_COLORS.slice(); },
    getClothColors: function () { return CLOTH_COLORS.slice(); },
    SPRITE_SIZE: SPRITE_SIZE
  };
})();
