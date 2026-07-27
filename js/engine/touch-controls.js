/**
 * engine/touch-controls.js
 * Dos joysticks "flotantes": aparecen donde el dedo toca.
 */
var TouchControls = (function () {
  var MAX_RADIUS = 46;
  var DEAD_ZONE = 10;

  function setupZone(zoneEl, joystickEl, knobEl, onMove, onEnd) {
    var touchId = null;
    var originX = 0, originY = 0;

    function showAt(x, y) {
      var rect = zoneEl.getBoundingClientRect();
      joystickEl.style.left = (x - rect.left) + "px";
      joystickEl.style.top = (y - rect.top) + "px";
      joystickEl.style.opacity = "1";
    }

    function moveKnob(dx, dy) {
      knobEl.style.transform = "translate(" + dx + "px, " + dy + "px)";
    }

    function reset() {
      touchId = null;
      joystickEl.style.opacity = "0";
      moveKnob(0, 0);
      onEnd();
    }

    zoneEl.addEventListener("touchstart", function (e) {
      if (touchId !== null) return;
      var t = e.changedTouches[0];
      touchId = t.identifier;
      originX = t.clientX;
      originY = t.clientY;
      showAt(originX, originY);
      moveKnob(0, 0);
      e.preventDefault();
    }, { passive: false });

    zoneEl.addEventListener("touchmove", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier !== touchId) continue;
        var dx = t.clientX - originX;
        var dy = t.clientY - originY;
        var dist = Math.hypot(dx, dy);
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
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) reset();
      }
    }
    zoneEl.addEventListener("touchend", handleTouchEnd, { passive: false });
    zoneEl.addEventListener("touchcancel", handleTouchEnd, { passive: false });
  }

  function init() {
    var moveZone = document.getElementById("touch-zone-move");
    var moveStick = document.getElementById("joystick-move");
    var moveKnob = moveStick.querySelector(".joystick-knob");

    var aimZone = document.getElementById("touch-zone-aim");
    var aimStick = document.getElementById("joystick-aim");
    var aimKnob = aimStick.querySelector(".joystick-knob");

    setupZone(moveZone, moveStick, moveKnob,
      function (dx, dy, dist) {
        if (dist < DEAD_ZONE) {
          Input.setTouchMove(0, 0);
        } else {
          Input.setTouchMove(dx / MAX_RADIUS, dy / MAX_RADIUS);
        }
      },
      function () { Input.clearTouchMove(); }
    );

    setupZone(aimZone, aimStick, aimKnob,
      function (dx, dy, dist) {
        var angle = Math.atan2(dy, dx);
        Input.setTouchAim(angle, dist >= DEAD_ZONE);
      },
      function () { Input.clearTouchAim(); }
    );
  }

  return { init: init };
})();
