/**
 * engine/input.js — Keyboard + mouse + touch → Game.setInput
 */
var InputManager = (function () {
  console.log("[InputManager] loading…");

  var canvas = null;
  var callback = null;
  var keys = {};
  var mouse = { x: 0, y: 0, down: false };
  var playerX = 0, playerY = 0;
  var currentWeapon = "sword";
  var weaponIndex = 1;
  var WEAPON_LIST = ["knife", "sword", "axe", "bow", "crossbow"];
  var lastCallbackTime = 0;

  function init(cvs, cb) {
    canvas = cvs;
    callback = cb;
    keys = {};
    mouse = { x: 0, y: 0, down: false };

    window.addEventListener("keydown", function (e) {
      keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", function (e) {
      keys[e.code] = false;
    });

    if (canvas) {
      canvas.addEventListener("mousemove", function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      });
      canvas.addEventListener("mousedown", function () { mouse.down = true; });
      canvas.addEventListener("mouseup", function () { mouse.down = false; });
      canvas.addEventListener("mouseleave", function () { mouse.down = false; });
      canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      canvas.addEventListener("touchstart", function (e) { e.preventDefault(); }, { passive: false });
      canvas.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
    }

    setInterval(update, 1000 / 60);
    console.log("[InputManager] ready");
  }

  function setPlayerPos(x, y) {
    playerX = x;
    playerY = y;
  }

  function setWeapon(w) {
    currentWeapon = w;
    weaponIndex = WEAPON_LIST.indexOf(w);
    if (weaponIndex < 0) weaponIndex = 1;
    if (typeof WeaponBar !== "undefined" && WeaponBar.setActive) {
      WeaponBar.setActive(w);
    }
  }

  function update() {
    if (!callback) return;
    var now = performance.now();
    if (now - lastCallbackTime < 8) return;
    lastCallbackTime = now;

    var dx = 0, dy = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) dy = -1;
    if (keys["KeyS"] || keys["ArrowDown"]) dy = 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) dx = -1;
    if (keys["KeyD"] || keys["ArrowRight"]) dx = 1;

    if (window.Input && window.Input.touchMove) {
      if (window.Input.touchMove.dx !== 0 || window.Input.touchMove.dy !== 0) {
        dx = window.Input.touchMove.dx;
        dy = window.Input.touchMove.dy;
      }
    }

    var len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }

    var angle = 0;
    var touchAimActive = window.Input && window.Input.touchAim && window.Input.touchAim.active;

    if (touchAimActive) {
      angle = window.Input.touchAim.angle;
    } else if ((playerX !== 0 || playerY !== 0) && typeof Camera !== "undefined" && Camera.screenToWorld) {
      var worldMouse = Camera.screenToWorld(mouse.x, mouse.y);
      angle = Math.atan2(worldMouse.y - playerY, worldMouse.x - playerX);
    } else if (canvas) {
      angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
    }

    var attack = mouse.down || touchAimActive;

    // Skills from AbilityInput (1/2/3 + Space / touch buttons)
    var skills = { skill0: false, skill1: false, skill2: false, ultimate: false };
    if (typeof AbilityInput !== "undefined" && AbilityInput.consumeSkills) {
      skills = AbilityInput.consumeSkills();
    }

    callback({
      dx: dx,
      dy: dy,
      angle: angle,
      attack: attack,
      weapon: currentWeapon,
      skill0: !!skills.skill0,
      skill1: !!skills.skill1,
      skill2: !!skills.skill2,
      ultimate: !!skills.ultimate
    });
  }

  return { init: init, setPlayerPos: setPlayerPos, setWeapon: setWeapon };
})();
