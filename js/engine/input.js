/**
 * engine/input.js
 * Captura input local: movimiento (WASD/flechas), ángulo de mira (mouse),
 * ataque (click) y cambio de arma (teclas 1-5).
 */
const Input = (() => {
  const keys = new Set();
  let mouseX = 0, mouseY = 0;
  let attackHeld = false;
  let weaponSelectListener = null;
  let canvasEl = null;

  // Estado de los joysticks táctiles (alimentado por engine/touch-controls.js)
  let touchMove = { dx: 0, dy: 0 };      // joystick izquierdo
  let touchAimAngle = 0;                  // joystick derecho
  let touchAiming = false;                // ¿el joystick derecho está activo?
  let touchAttacking = false;             // ¿más allá de la zona muerta? = atacar

  const WEAPON_KEYS = { "1": "knife", "2": "sword", "3": "axe", "4": "bow", "5": "crossbow" };

  function init(canvas) {
    canvasEl = canvas;
    window.addEventListener("keydown", (e) => {
      keys.add(e.key.toLowerCase());
      if (WEAPON_KEYS[e.key] && weaponSelectListener) weaponSelectListener(WEAPON_KEYS[e.key]);
    });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener("mousedown", () => (attackHeld = true));
    window.addEventListener("mouseup", () => (attackHeld = false));
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function onWeaponSelect(fn) {
    weaponSelectListener = fn;
  }

  function selectWeapon(weaponId) {
    if (weaponSelectListener) weaponSelectListener(weaponId);
  }

  // --- Llamado por touch-controls.js ---
  function setTouchMove(dx, dy) {
    touchMove = { dx, dy };
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
    // El joystick táctil tiene prioridad si está activo; si no, teclado.
    if (touchMove.dx !== 0 || touchMove.dy !== 0) return touchMove;
    let dx = 0, dy = 0;
    if (keys.has("w") || keys.has("arrowup")) dy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dy += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    return { dx: dx / len, dy: dy / len };
  }

  // Ángulo de mira relativo al centro del canvas (el jugador local se dibuja centrado).
  function getAimAngle() {
    if (touchAiming) return touchAimAngle;
    if (!canvasEl) return 0;
    const cx = canvasEl.width / 2;
    const cy = canvasEl.height / 2;
    return Math.atan2(mouseY - cy, mouseX - cx);
  }

  function isAttacking() {
    return attackHeld || touchAttacking;
  }

  return {
    init, onWeaponSelect, selectWeapon, getMoveVector, getAimAngle, isAttacking,
    setTouchMove, clearTouchMove, setTouchAim, clearTouchAim,
  };
})();
