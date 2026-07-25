/**
 * engine/touch-controls.js
 * Dos joysticks "flotantes": aparecen donde el dedo toca, dentro de su mitad
 * de la pantalla. Izquierdo = movimiento. Derecho = apuntar + atacar
 * (mantener presionado más allá de la zona muerta = atacar sin soltar).
 * No interfiere con teclado/mouse: son sistemas de entrada independientes
 * que confluyen en engine/input.js.
 */
const TouchControls = (() => {
  const MAX_RADIUS = 46; // px de pantalla que el dedo puede alejarse del centro
  const DEAD_ZONE = 10;

  function setupZone(zoneEl, joystickEl, knobEl, onMove, onEnd) {
    let touchId = null;
    let originX = 0, originY = 0;

    function showAt(x, y) {
      const rect = zoneEl.getBoundingClientRect();
      joystickEl.style.left = `${x - rect.left}px`;
      joystickEl.style.top = `${y - rect.top}px`;
      joystickEl.style.opacity = "1";
    }

    function moveKnob(dx, dy) {
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    function reset() {
      touchId = null;
      joystickEl.style.opacity = "0";
      moveKnob(0, 0);
      onEnd();
    }

    zoneEl.addEventListener("touchstart", (e) => {
      if (touchId !== null) return; // ya hay un dedo en esta zona
      const t = e.changedTouches[0];
      touchId = t.identifier;
      originX = t.clientX;
      originY = t.clientY;
      showAt(originX, originY);
      moveKnob(0, 0);
      e.preventDefault();
    }, { passive: false });

    zoneEl.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== touchId) continue;
        let dx = t.clientX - originX;
        let dy = t.clientY - originY;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_RADIUS) {
          dx = (dx / dist) * MAX_RADIUS;
          dy = (dy / dist) * MAX_RADIUS;
        }
        moveKnob(dx, dy);
        onMove(dx, dy, dist);
        e.preventDefault();
      }
    }, { passive: false });

    function handleTouchEnd(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) reset();
      }
    }
    zoneEl.addEventListener("touchend", handleTouchEnd, { passive: false });
    zoneEl.addEventListener("touchcancel", handleTouchEnd, { passive: false });
  }

  function init() {
    const moveZone = document.getElementById("touch-zone-move");
    const moveStick = document.getElementById("joystick-move");
    const moveKnob = moveStick.querySelector(".joystick-knob");

    const aimZone = document.getElementById("touch-zone-aim");
    const aimStick = document.getElementById("joystick-aim");
    const aimKnob = aimStick.querySelector(".joystick-knob");

    setupZone(moveZone, moveStick, moveKnob,
      (dx, dy, dist) => {
        if (dist < DEAD_ZONE) {
          Input.setTouchMove(0, 0);
        } else {
          Input.setTouchMove(dx / MAX_RADIUS, dy / MAX_RADIUS);
        }
      },
      () => Input.clearTouchMove()
    );

    setupZone(aimZone, aimStick, aimKnob,
      (dx, dy, dist) => {
        const angle = Math.atan2(dy, dx);
        Input.setTouchAim(angle, dist >= DEAD_ZONE);
      },
      () => Input.clearTouchAim()
    );
  }

  return { init };
})();
