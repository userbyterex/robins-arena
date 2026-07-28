/**
 * engine/input.js — Keyboard + mouse input with Ultimate support.
 */
var InputManager = (function () {
  var keys = {};
  var mouse = { x: 0, y: 0, down: false };
  var canvas = null;
  var callback = null;
  var currentWeapon = "sword";

  function init(cvs, cb) {
    canvas = cvs;
    callback = cb;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onWheel, { passive: false });
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === "Digit1") currentWeapon = "knife";
    if (e.code === "Digit2") currentWeapon = "sword";
    if (e.code === "Digit3") currentWeapon = "axe";
    if (e.code === "Digit4") currentWeapon = "bow";
    if (e.code === "Digit5") currentWeapon = "crossbow";
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function onMouseDown(e) {
    if (e.button === 0) mouse.down = true;
  }

  function onMouseUp(e) {
    if (e.button === 0) mouse.down = false;
  }

  function onWheel(e) {
    e.preventDefault();
    var order = ["knife", "sword", "axe", "bow", "crossbow"];
    var idx = order.indexOf(currentWeapon);
    if (e.deltaY > 0) idx = (idx + 1) % order.length;
    else idx = (idx - 1 + order.length) % order.length;
    currentWeapon = order[idx];
  }

  function update() {
    if (!callback) return;
    var dx = 0, dy = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) dy -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) dy += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) dx -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) dx += 1;
    var len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }

    var rect = canvas.getBoundingClientRect();
    var centerX = rect.width / 2;
    var centerY = rect.height / 2;
    var angle = Math.atan2(mouse.y - centerY, mouse.x - centerX);

    // Ultimate: Space or Q (single press detection)
    var ultimate = false;
    if (keys["Space"] || keys["KeyQ"]) {
      if (!keys._ultimateConsumed) {
        ultimate = true;
        keys._ultimateConsumed = true;
      }
    } else {
      keys._ultimateConsumed = false;
    }

    callback({
      dx: dx,
      dy: dy,
      angle: angle,
      attack: mouse.down,
      weapon: currentWeapon,
      ultimate: ultimate,
    });
  }

  // Auto-update loop
  setInterval(update, 1000 / 60);

  return { init: init };
})();
