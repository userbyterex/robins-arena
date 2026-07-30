/**
 * engine/input.js — Unified input: keyboard, mouse, touch, ability.
 * Exposes window.Input for touch-controls.js compatibility.
 */

window.Input = {
  touchMove: { dx: 0, dy: 0 },
  touchAim: { angle: 0, active: false },
  setTouchMove: function (dx, dy) { this.touchMove.dx = dx; this.touchMove.dy = dy; },
  clearTouchMove: function () { this.touchMove.dx = 0; this.touchMove.dy = 0; },
  setTouchAim: function (angle, active) { this.touchAim.angle = angle; this.touchAim.active = active; },
  clearTouchAim: function () { this.touchAim.active = false; }
};

var InputManager = (function () {
  var keys = {};
  var mouse = { x: 0, y: 0, down: false, rightDown: false };
  var canvas = null;
  var callback = null;
  var currentWeapon = "sword";
  var playerX = 0, playerY = 0;
  var weaponIndex = 1;
  var WEAPON_LIST = ["knife", "sword", "axe", "bow", "crossbow"];
  var lastCallbackTime = 0;

  function init(cvs, cb) {
    canvas = cvs;
    callback = cb;
    bindEvents();
    startLoop();
  }

  function setPlayerPos(x, y) {
    playerX = x;
    playerY = y;
  }

  function bindEvents() {
    window.addEventListener("keydown", function (e) {
      keys[e.code] = true;
      if (e.code >= "Digit1" && e.code <= "Digit5") {
        var idx = parseInt(e.code.replace("Digit", ""), 10) - 1;
        if (idx >= 0 && idx < WEAPON_LIST.length) setWeapon(WEAPON_LIST[idx]);
      }
      if (e.code === "Space" || e.code === "KeyQ") {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", function (e) {
      keys[e.code] = false;
    });

    var rectCache = null;
    function getRect() {
      if (!rectCache || performance.now() - rectCache.time > 500) {
        rectCache = { rect: canvas.getBoundingClientRect(), time: performance.now() };
      }
      return rectCache.rect;
    }

    canvas.addEventListener("mousemove", function (e) {
      var rect = getRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener("mousedown", function (e) {
      if (e.button === 0) mouse.down = true;
      if (e.button === 2) mouse.rightDown = true;
    });

    canvas.addEventListener("mouseup", function (e) {
      if (e.button === 0) mouse.down = false;
      if (e.button === 2) mouse.rightDown = false;
    });

    canvas.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });

    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      var dir = e.deltaY > 0 ? 1 : -1;
      weaponIndex = (weaponIndex + dir + WEAPON_LIST.length) % WEAPON_LIST.length;
      setWeapon(WEAPON_LIST[weaponIndex]);
    }, { passive: false });

    canvas.addEventListener("touchstart", function (e) { e.preventDefault(); }, { passive: false });
    canvas.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
  }

  function setWeapon(w) {
    currentWeapon = w;
    weaponIndex = WEAPON_LIST.indexOf(w);
    if (weaponIndex < 0) weaponIndex = 1;
    if (typeof WeaponBar !== "undefined" && WeaponBar.setActive) {
      WeaponBar.setActive(w);
    }
  }

  function startLoop() {
    setInterval(update, 1000 / 60);
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
    if (window.Input && window.Input.touchAim && window.Input.touchAim.active) {
      angle = window.Input.touchAim.angle;
    } else if ((playerX !== 0 || playerY !== 0) && typeof Camera !== "undefined" && Camera.screenToWorld) {
      var worldMouse = Camera.screenToWorld(mouse.x, mouse.y);
      angle = Math.atan2(worldMouse.y - playerY, worldMouse.x - playerX);
    } else {
      var cx = canvas ? canvas.width / 2 : 0;
      var cy = canvas ? canvas.height / 2 : 0;
      angle = Math.atan2(mouse.y - cy, mouse.x - cx);
    }

    var ultimate = false;
    if (typeof AbilityInput !== "undefined" && AbilityInput.consume) {
      ultimate = AbilityInput.consume();
    }

    callback({
      dx: dx,
      dy: dy,
      angle: angle,
      attack: mouse.down,
      weapon: currentWeapon,
      ultimate: ultimate
    });
  }

    return {
    init: init,
    setPlayerPos: setPlayerPos,
    setWeapon: setWeapon   // ← AÑADIDO
  };
