/**
 * pixel-character.js — High-detail unique class sprites (48px).
 * Distinct silhouettes per class. With integration logging.
 */
var PixelCharacter = (function () {
  console.log("[PixelCharacter] loading…");

  var SPRITE_SIZE = 48;
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
    var r = (num >> 16) + amt;
    var g = ((num >> 8) & 0xff) + amt;
    var b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
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
    px(ctx, shade(pal.cloth, -25), 18, 32, 5, 10);
    px(ctx, shade(pal.cloth, -25), 25, 32, 5, 10);
    px(ctx, boot || "#2a1c10", 17, 40, 7, 4);
    px(ctx, boot || "#2a1c10", 24, 40, 7, 4);
    px(ctx, shade(boot || "#2a1c10", 20), 18, 41, 5, 1);
    px(ctx, shade(boot || "#2a1c10", 20), 25, 41, 5, 1);
  }

  function drawHead(ctx, pal, opts) {
    opts = opts || {};
    px(ctx, shade(pal.skin, -15), 21, 14, 6, 3);
    px(ctx, pal.skin, 18, 8, 12, 9);
    px(ctx, shade(pal.skin, 18), 19, 9, 10, 3);
    px(ctx, "#1a120c", 20, 11, 2, 2);
    px(ctx, "#1a120c", 26, 11, 2, 2);
    px(ctx, "#fff", 20, 11, 1, 1);
    px(ctx, "#fff", 26, 11, 1, 1);
    px(ctx, shade(pal.skin, -30), 22, 14, 4, 1);
    if (!opts.noHair) {
      px(ctx, pal.hair, 17, 6, 14, 4);
      px(ctx, shade(pal.hair, 15), 18, 5, 12, 2);
    }
  }

  /* ── WARRIOR ── */
  function drawWarrior(ctx, pal) {
    drawLegs(ctx, pal, "#3a3a3a");
    px(ctx, pal.cloth, 16, 17, 16, 16);
    px(ctx, shade(pal.cloth, 25), 17, 18, 14, 6);
    px(ctx, shade(pal.cloth, -20), 16, 28, 16, 5);
    px(ctx, "#c9a227", 18, 24, 12, 3);
    px(ctx, "#e8d060", 20, 25, 8, 1);
    px(ctx, pal.cloth, 11, 18, 5, 10);
    px(ctx, pal.cloth, 32, 18, 5, 10);
    px(ctx, pal.skin, 11, 27, 5, 3);
    px(ctx, pal.skin, 32, 27, 5, 3);
    px(ctx, shade(pal.cloth, -30), 10, 16, 7, 5);
    px(ctx, shade(pal.cloth, -30), 31, 16, 7, 5);
    px(ctx, "#c9a227", 11, 17, 5, 1);
    px(ctx, "#c9a227", 32, 17, 5, 1);
    drawHead(ctx, pal, { noHair: true });
    px(ctx, "#5a5a5a", 17, 4, 14, 6);
    px(ctx, "#6a6a6a", 18, 3, 12, 3);
    px(ctx, "#7a7a7a", 20, 5, 8, 2);
    px(ctx, "#c9a227", 22, 1, 4, 4);
    px(ctx, "#e8d060", 23, 0, 2, 2);
    px(ctx, "#1a1a1a", 20, 8, 8, 2);
    px(ctx, "#8a6a30", 6, 18, 6, 12);
    px(ctx, "#c9a227", 7, 20, 4, 8);
    px(ctx, "#e8d060", 8, 22, 2, 4);
    px(ctx, "#c0c0c0", 37, 14, 3, 14);
    px(ctx, "#e8e8e8", 38, 14, 1, 12);
    px(ctx, "#c9a227", 36, 26, 5, 2);
    px(ctx, "#5a4020", 37, 28, 3, 4);
  }

  /* ── RANGER ── */
  function drawRanger(ctx, pal) {
    drawLegs(ctx, pal, "#2a1c10");
    px(ctx, pal.cloth, 16, 17, 16, 15);
    px(ctx, shade(pal.cloth, 20), 17, 18, 14, 5);
    px(ctx, "#5a4020", 16, 28, 16, 3);
    px(ctx, "#c9a227", 22, 28, 4, 3);
    px(ctx, shade(pal.cloth, -10), 11, 18, 5, 9);
    px(ctx, shade(pal.cloth, -10), 32, 18, 5, 9);
    px(ctx, pal.skin, 11, 26, 5, 3);
    px(ctx, pal.skin, 32, 26, 5, 3);
    px(ctx, shade(pal.cloth, -35), 12, 16, 4, 18);
    px(ctx, shade(pal.cloth, -35), 32, 16, 4, 18);
    drawHead(ctx, pal);
    px(ctx, shade(pal.cloth, -15), 15, 3, 18, 8);
    px(ctx, pal.cloth, 16, 2, 16, 5);
    px(ctx, shade(pal.cloth, 20), 18, 3, 12, 3);
    px(ctx, shade(pal.cloth, -25), 15, 8, 4, 6);
    px(ctx, shade(pal.cloth, -25), 29, 8, 4, 6);
    px(ctx, "#5a4020", 34, 12, 5, 14);
    px(ctx, "#c9a227", 35, 10, 3, 4);
    px(ctx, "#8b6914", 35, 14, 1, 10);
    px(ctx, "#8b6914", 37, 14, 1, 10);
    px(ctx, "#6b4226", 39, 10, 2, 20);
    px(ctx, "#8b6914", 40, 12, 1, 16);
    px(ctx, "#c9a227", 39, 9, 2, 2);
    px(ctx, "#c9a227", 39, 29, 2, 2);
  }

  /* ── MAGE ── */
  function drawMage(ctx, pal) {
    px(ctx, pal.cloth, 14, 28, 20, 12);
    px(ctx, shade(pal.cloth, 15), 15, 29, 18, 4);
    px(ctx, shade(pal.cloth, -20), 14, 36, 20, 4);
    px(ctx, "#2a1c10", 18, 40, 5, 4);
    px(ctx, "#2a1c10", 25, 40, 5, 4);
    px(ctx, pal.cloth, 16, 16, 16, 14);
    px(ctx, shade(pal.cloth, 20), 17, 17, 14, 6);
    px(ctx, shade(pal.cloth, 40), 16, 26, 16, 3);
    px(ctx, "#9b59b6", 20, 26, 8, 3);
    px(ctx, "#e8d060", 22, 27, 4, 1);
    px(ctx, pal.cloth, 8, 17, 8, 10);
    px(ctx, pal.cloth, 32, 17, 8, 10);
    px(ctx, shade(pal.cloth, -15), 8, 24, 8, 4);
    px(ctx, shade(pal.cloth, -15), 32, 24, 8, 4);
    px(ctx, pal.skin, 9, 26, 4, 3);
    px(ctx, pal.skin, 35, 26, 4, 3);
    drawHead(ctx, pal, { noHair: true });
    px(ctx, pal.cloth, 16, 5, 16, 5);
    px(ctx, shade(pal.cloth, -10), 18, 3, 12, 3);
    px(ctx, shade(pal.cloth, -20), 20, 1, 8, 3);
    px(ctx, shade(pal.cloth, -30), 22, 0, 4, 2);
    px(ctx, "#9b59b6", 16, 8, 16, 2);
    px(ctx, pal.hair, 17, 9, 3, 3);
    px(ctx, pal.hair, 28, 9, 3, 3);
    px(ctx, "#5a4020", 40, 6, 3, 32);
    px(ctx, "#7a60a0", 38, 4, 7, 5);
    px(ctx, "#9a80c0", 39, 3, 5, 3);
    px(ctx, "#e0d0ff", 41, 4, 2, 2);
  }

  /* ── MONK ── */
  function drawMonk(ctx, pal) {
    drawLegs(ctx, pal, "#8a6a40");
    px(ctx, pal.cloth, 16, 17, 16, 15);
    px(ctx, shade(pal.cloth, 22), 17, 18, 14, 6);
    px(ctx, "#3d9e58", 16, 26, 16, 4);
    px(ctx, "#2d7a40", 18, 27, 12, 2);
    px(ctx, "#c9a227", 22, 26, 4, 4);
    px(ctx, shade(pal.cloth, -10), 11, 18, 5, 8);
    px(ctx, shade(pal.cloth, -10), 32, 18, 5, 8);
    px(ctx, pal.skin, 11, 25, 5, 4);
    px(ctx, pal.skin, 32, 25, 5, 4);
    drawHead(ctx, pal);
    px(ctx, pal.hair, 15, 7, 4, 8);
    px(ctx, pal.hair, 29, 7, 4, 8);
    px(ctx, pal.hair, 16, 5, 16, 3);
    px(ctx, "#e8a0a0", 18, 5, 2, 2);
    px(ctx, "#a0e8a0", 28, 5, 2, 2);
    px(ctx, "#e8e8a0", 23, 4, 2, 2);
    px(ctx, "#5a4020", 8, 8, 3, 28);
    px(ctx, "#3d9e58", 6, 5, 7, 5);
    px(ctx, "#2d7a40", 7, 4, 5, 3);
    px(ctx, "#6bcf7a", 8, 6, 3, 2);
    px(ctx, "#c9a227", 20, 16, 2, 2);
    px(ctx, "#e8d060", 24, 16, 2, 2);
    px(ctx, "#c9a227", 28, 16, 2, 2);
  }

  function generate(classId, appearance) {
    var key = (classId || "warrior") + "_" + JSON.stringify(appearance || {});
    if (cache.has(key)) return cache.get(key);

    var canvas = document.createElement("canvas");
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[PixelCharacter] no 2d context");
      return canvas;
    }
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
      default:
        console.warn("[PixelCharacter] unknown class:", id, "→ warrior");
        drawWarrior(ctx, pal);
        break;
    }

    cache.set(key, canvas);
    _genCount++;
    if (_genCount <= 8 || _genCount % 20 === 0) {
      console.log("[PixelCharacter] generated #" + _genCount, id, "cache", cache.size);
    }
    return canvas;
  }

  console.log("[PixelCharacter] ready — size", SPRITE_SIZE + "px",
    "skins", SKIN_TONES.length, "hair", HAIR_COLORS.length, "cloth", CLOTH_COLORS.length);

  return {
    generate: generate,
    getSkinTones: function () { return SKIN_TONES.slice(); },
    getHairColors: function () { return HAIR_COLORS.slice(); },
    getClothColors: function () { return CLOTH_COLORS.slice(); },
    SPRITE_SIZE: SPRITE_SIZE
  };
})();
