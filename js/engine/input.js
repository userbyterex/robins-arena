/**
 * engine/input.js
 * Captura input local: movimiento (WASD/flechas), ángulo de mira (mouse),
 * ataque (click) y cambio de arma (teclas 1-5).
 */
var Input = (function () {
  var keys = new Set();
  var mouseX = 0, mouseY = 0;
  var attackHeld = false;
  var weaponSelectListener = null;
  var canvasEl = null;

  var touchMove = { dx: 0, dy: 0 };
  var touchAimAngle = 0;
  var touchAiming = false;
  var touchAttacking = false;

  var WEAPON_KEYS = { "1": "knife", "2": "sword", "3": "axe", "4": "bow", "5": "crossbow" };

  function init(canvas) {
    canvasEl = canvas;
    window.addEventListener("keydown", function (e) {
      keys.add(e.key.toLowerCase());
      if (WEAPON_KEYS[e.key] && weaponSelectListener) weaponSelectListener(WEAPON_KEYS[e.key]);
    });
    window.addEventListener("keyup", function (e) {
      keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener("mousedown", function () { attackHeld = true; });
    window.addEventListener("mouseup", function () { attackHeld = false; });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  function onWeaponSelect(fn) {
    weaponSelectListener = fn;
  }

  function selectWeapon(weaponId) {
    if (weaponSelectListener) weaponSelectListener(weaponId);
  }

  function setTouchMove(dx, dy) {
    touchMove = { dx: dx, dy: dy };
  }
  function clearTouchMove() {
    touchMove = { dx: 0, dy: 0 };
  }
  function setTouchAim(angle, attacking) {
    touchAimAngle = angle;
    touchAiming = true;
    touchAttacking = attacking;
  }
  function clearTouchAim() {
    touchAiming = false;
    touchAttacking = false;
  }

  function getMoveVector() {
    if (touchMove.dx !== 0 || touchMove.dy !== 0) return touchMove;
    var dx = 0, dy = 0;
    if (keys.has("w") || keys.has("arrowup")) dy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dy += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;
    var len = Math.hypot(dx, dy) || 1;
    return { dx: dx / len, dy: dy / len };
  }

  function getAimAngle() {
    if (touchAiming) return touchAimAngle;
    if (!canvasEl) return 0;
    var cx = canvasEl.width / 2;
    var cy = canvasEl.height / 2;
    return Math.atan2(mouseY - cy, mouseX - cx);
  }

  function isAttacking() {
    return attackHeld || touchAttacking;
  }

  return {
    init: init,
    onWeaponSelect: onWeaponSelect,
    selectWeapon: selectWeapon,
    getMoveVector: getMoveVector,
    getAimAngle: getAimAngle,
    isAttacking: isAttacking,
    setTouchMove: setTouchMove,
    clearTouchMove: clearTouchMove,
    setTouchAim: setTouchAim,
    clearTouchAim: clearTouchAim,
  };
})();
