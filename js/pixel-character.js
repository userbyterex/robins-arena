/**
 * pixel-character.js — Procedural pixel-art character generator.
 */
var PixelCharacter = (function () {
  var SPRITE_SIZE = 32;
  var cache = new Map();
  var SKIN_TONES = ["#f5d0a9","#e8b89a","#d4a373","#c68e5f","#a67c52","#8d5524","#6f4e37","#3d2314","#ffdbac","#e0ac69"];
  var HAIR_COLORS = ["#1a1a1a","#3d2314","#6b4226","#8b6914","#c9a227","#d4a574","#e8dcc0","#8a2be2","#c0392b","#2ecc71"];
  var CLOTH_COLORS = ["#c0392b","#2980b9","#27ae60","#8e44ad","#d35400","#2c3e50","#7f8c8d","#16a085","#f39c12","#e74c3c"];

  function shade(hex, amt) {
    var num = parseInt(hex.slice(1), 16);
    var r = (num >> 16) + amt, g = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function getPalette(appearance) {
    return { skin: appearance.skin || SKIN_TONES[0], hair: appearance.hair || HAIR_COLORS[0], cloth: appearance.cloth || CLOTH_COLORS[0], accent: appearance.accent || CLOTH_COLORS[4] };
  }

  function drawWarrior(ctx, pal) {
    ctx.fillStyle = "#4a3720"; ctx.fillRect(12, 22, 3, 6); ctx.fillRect(17, 22, 3, 6);
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(11, 27, 4, 2); ctx.fillRect(17, 27, 4, 2);
    ctx.fillStyle = pal.cloth; ctx.fillRect(10, 14, 12, 10);
    ctx.fillStyle = shade(pal.cloth, 20); ctx.fillRect(11, 15, 10, 8);
    ctx.fillStyle = "#c9a227"; ctx.fillRect(13, 16, 6, 4); ctx.fillStyle = shade(pal.cloth, 40); ctx.fillRect(14, 17, 4, 2);
    ctx.fillStyle = pal.cloth; ctx.fillRect(8, 15, 2, 7); ctx.fillRect(22, 15, 2, 7);
    ctx.fillStyle = pal.skin; ctx.fillRect(8, 21, 2, 2); ctx.fillRect(22, 21, 2, 2);
    ctx.fillStyle = pal.skin; ctx.fillRect(12, 8, 8, 7);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(14, 11, 1, 1); ctx.fillRect(17, 11, 1, 1); ctx.fillStyle = "#8a5a3a"; ctx.fillRect(14, 13, 4, 1);
    ctx.fillStyle = "#5a5a5a"; ctx.fillRect(11, 6, 10, 4); ctx.fillStyle = "#6a6a6a"; ctx.fillRect(12, 5, 8, 2); ctx.fillStyle = "#7a7a7a"; ctx.fillRect(14, 7, 4, 1);
    ctx.fillStyle = "#c9a227"; ctx.fillRect(15, 3, 2, 3);
    ctx.fillStyle = shade(pal.cloth, -30); ctx.fillRect(9, 14, 2, 12); ctx.fillRect(21, 14, 2, 12);
    ctx.fillStyle = "#8a6a30"; ctx.fillRect(22, 12, 3, 5); ctx.fillStyle = "#c9a227"; ctx.fillRect(23, 13, 1, 3);
  }

  function drawRanger(ctx, pal) {
    ctx.fillStyle = "#3a3020"; ctx.fillRect(12, 22, 3, 6); ctx.fillRect(17, 22, 3, 6);
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(11, 27, 4, 2); ctx.fillRect(17, 27, 4, 2);
    ctx.fillStyle = "#5a4020"; ctx.fillRect(10, 14, 12, 10); ctx.fillStyle = "#6a5030"; ctx.fillRect(11, 15, 10, 8);
    ctx.fillStyle = "#3a2010"; ctx.fillRect(10, 20, 12, 2); ctx.fillStyle = "#c9a227"; ctx.fillRect(14, 20, 4, 2);
    ctx.fillStyle = "#5a4020"; ctx.fillRect(8, 15, 2, 7); ctx.fillRect(22, 15, 2, 7);
    ctx.fillStyle = pal.skin; ctx.fillRect(8, 21, 2, 2); ctx.fillRect(22, 21, 2, 2);
    ctx.fillStyle = pal.skin; ctx.fillRect(12, 8, 8, 7);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(14, 11, 1, 1); ctx.fillRect(17, 11, 1, 1); ctx.fillStyle = "#8a5a3a"; ctx.fillRect(14, 13, 4, 1);
    ctx.fillStyle = pal.cloth; ctx.fillRect(11, 5, 10, 5); ctx.fillStyle = shade(pal.cloth, -20); ctx.fillRect(12, 4, 8, 2);
    ctx.fillStyle = pal.cloth; ctx.fillRect(11, 9, 2, 4); ctx.fillRect(19, 9, 2, 4);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(12, 10, 8, 1);
    ctx.fillStyle = pal.hair; ctx.fillRect(13, 9, 2, 2); ctx.fillRect(17, 9, 2, 2);
    ctx.fillStyle = "#5a4020"; ctx.fillRect(22, 10, 3, 8); ctx.fillStyle = "#c9a227"; ctx.fillRect(23, 8, 1, 3);
    ctx.fillStyle = shade(pal.cloth, -20); ctx.fillRect(9, 14, 2, 10); ctx.fillRect(21, 14, 2, 10);
  }

  function drawMage(ctx, pal) {
    ctx.fillStyle = pal.cloth; ctx.fillRect(10, 20, 12, 8); ctx.fillStyle = shade(pal.cloth, 15); ctx.fillRect(11, 21, 10, 6);
    ctx.fillStyle = "#3a3020"; ctx.fillRect(13, 26, 2, 3); ctx.fillRect(17, 26, 2, 3);
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(12, 28, 3, 2); ctx.fillRect(17, 28, 3, 2);
    ctx.fillStyle = pal.cloth; ctx.fillRect(10, 12, 12, 10); ctx.fillStyle = shade(pal.cloth, 15); ctx.fillRect(11, 13, 10, 8);
    ctx.fillStyle = pal.accent; ctx.fillRect(10, 18, 12, 2);
    ctx.fillStyle = pal.cloth; ctx.fillRect(7, 14, 4, 6); ctx.fillRect(21, 14, 4, 6);
    ctx.fillStyle = pal.skin; ctx.fillRect(7, 19, 2, 2); ctx.fillRect(23, 19, 2, 2);
    ctx.fillStyle = pal.skin; ctx.fillRect(12, 7, 8, 7);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(14, 10, 1, 1); ctx.fillRect(17, 10, 1, 1); ctx.fillStyle = "#8a5a3a"; ctx.fillRect(14, 12, 4, 1);
    ctx.fillStyle = pal.cloth; ctx.fillRect(11, 4, 10, 4); ctx.fillStyle = shade(pal.cloth, -10); ctx.fillRect(12, 2, 8, 3); ctx.fillStyle = shade(pal.cloth, -20); ctx.fillRect(13, 1, 6, 2); ctx.fillStyle = shade(pal.cloth, -30); ctx.fillRect(14, 0, 4, 2);
    ctx.fillStyle = pal.accent; ctx.fillRect(11, 6, 10, 1);
    ctx.fillStyle = "#5a4020"; ctx.fillRect(24, 8, 2, 20); ctx.fillStyle = "#7a60a0"; ctx.fillRect(23, 6, 4, 3); ctx.fillStyle = "#9a80c0"; ctx.fillRect(24, 5, 2, 2);
    ctx.fillStyle = pal.hair; ctx.fillRect(12, 7, 2, 2); ctx.fillRect(18, 7, 2, 2);
  }

  function drawHealer(ctx, pal) {
    ctx.fillStyle = "#4a5030"; ctx.fillRect(12, 22, 3, 6); ctx.fillRect(17, 22, 3, 6);
    ctx.fillStyle = "#8a6a40"; ctx.fillRect(11, 27, 4, 2); ctx.fillRect(17, 27, 4, 2);
    ctx.fillStyle = pal.cloth; ctx.fillRect(10, 14, 12, 10); ctx.fillStyle = shade(pal.cloth, 15); ctx.fillRect(11, 15, 10, 8);
    ctx.fillStyle = "#3d9e58"; ctx.fillRect(14, 16, 4, 3); ctx.fillStyle = "#2d7a40"; ctx.fillRect(15, 17, 2, 2);
    ctx.fillStyle = "#5a4020"; ctx.fillRect(10, 20, 12, 2); ctx.fillStyle = "#6a5030"; ctx.fillRect(12, 20, 3, 3); ctx.fillRect(17, 20, 3, 3);
    ctx.fillStyle = shade(pal.cloth, -10); ctx.fillRect(8, 15, 2, 7); ctx.fillRect(22, 15, 2, 7);
    ctx.fillStyle = pal.skin; ctx.fillRect(8, 21, 2, 2); ctx.fillRect(22, 21, 2, 2);
    ctx.fillStyle = pal.skin; ctx.fillRect(12, 8, 8, 7);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(14, 11, 1, 1); ctx.fillRect(17, 11, 1, 1); ctx.fillStyle = "#8a5a3a"; ctx.fillRect(14, 13, 4, 1);
    ctx.fillStyle = pal.hair; ctx.fillRect(11, 7, 2, 6); ctx.fillRect(19, 7, 2, 6); ctx.fillRect(12, 6, 8, 2); ctx.fillRect(10, 9, 2, 4); ctx.fillRect(20, 9, 2, 4);
    ctx.fillStyle = "#e8a0a0"; ctx.fillRect(13, 6, 2, 1); ctx.fillStyle = "#a0e8a0"; ctx.fillRect(17, 6, 2, 1); ctx.fillStyle = "#e8e8a0"; ctx.fillRect(15, 5, 2, 1);
    ctx.fillStyle = "#5a4020"; ctx.fillRect(7, 6, 2, 20); ctx.fillStyle = "#3d9e58"; ctx.fillRect(6, 4, 4, 3); ctx.fillStyle = "#2d7a40"; ctx.fillRect(7, 3, 2, 2);
    ctx.fillStyle = "#6a5030"; ctx.fillRect(21, 16, 3, 4); ctx.fillStyle = "#5a4020"; ctx.fillRect(22, 15, 1, 2);
  }

  function generate(classId, appearance) {
    var key = classId + "_" + JSON.stringify(appearance || {});
    if (cache.has(key)) return cache.get(key);
    var canvas = document.createElement("canvas");
    canvas.width = SPRITE_SIZE; canvas.height = SPRITE_SIZE;
    var ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false;
    var pal = getPalette(appearance || {});
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    switch (classId) {
      case "warrior": drawWarrior(ctx, pal); break;
      case "ranger": drawRanger(ctx, pal); break;
      case "mage": drawMage(ctx, pal); break;
      case "healer": drawHealer(ctx, pal); break;
      default: drawWarrior(ctx, pal); break;
    }
    cache.set(key, canvas);
    return canvas;
  }

  return {
    generate: generate,
    getSkinTones: function(){return SKIN_TONES;},
    getHairColors: function(){return HAIR_COLORS;},
    getClothColors: function(){return CLOTH_COLORS;},
    SPRITE_SIZE: SPRITE_SIZE
  };
})();
