/**
 * engine/touch-controls.js
 * Floating dual joysticks optimized for mobile landscape.
 * Left = move, Right = aim + attack (hold beyond dead zone).
 */
var TouchControls = (function () {
  var MAX_RADIUS = 54;      // slightly larger for thumbs
  var DEAD_ZONE = 12;
  var isTouchDevice = false;

  function isCoarsePointer() {
    try {
      return window.matchMedia("(pointer: coarse)").matches ||
             ("ontouchstart" in window) ||
             (navigator.maxTouchPoints > 0);
    } catch (e) {
      return "ontouchstart" in window;
    }
  }

  function setupZone(zoneEl, joystickEl, knobEl, onMove, onEnd) {
    var touchId = null;
    var originX = 0, originY = 0;

    function showAt(clientX, clientY) {
      var rect = zoneEl.getBoundingClientRect();
      var x = clientX - rect.left;
      var y = clientY - rect.top;
      // Keep stick inside zone margins
      x = Math.max(40, Math.min(rect.width - 40, x));
      y = Math.max(40, Math.min(rect.height - 40, y));
      joystickEl.style.left = x + "px";
      joystickEl.style.top = y + "px";
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
      // Ignore if tapping UI buttons (weapon bar / ability)
      var target = e.target;
      if (target && (target.id === "btn-ability" || target.closest(".weapon-bar") || target.closest(".ability-btn"))) {
        return;
      }
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
          dist = MAX_RADIUS;
        }
        moveKnob(dx, dy);
        onMove(dx, dy, dist);
        e.preventDefault();
      }
    }, { passive: false });

    function handleTouchEnd(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          reset();
          break;
        }
      }
    }
    zoneEl.addEventListener("touchend", handleTouchEnd, { passive: false });
    zoneEl.addEventListener("touchcancel", handleTouchEnd, { passive: false });
  }

  function init() {
    isTouchDevice = isCoarsePointer();

    var moveZone = document.getElementById("touch-zone-move");
    var moveStick = document.getElementById("joystick-move");
    var aimZone = document.getElementById("touch-zone-aim");
    var aimStick = document.getElementById("joystick-aim");
    var abilityBtn = document.getElementById("btn-ability");
    var weaponBar = document.getElementById("weapon-bar");

    // Hide touch UI on desktop (fine pointer)
    if (!isTouchDevice) {
      if (moveZone) moveZone.style.display = "none";
      if (aimZone) aimZone.style.display = "none";
      if (moveStick) moveStick.style.display = "none";
      if (aimStick) aimStick.style.display = "none";
      if (abilityBtn) abilityBtn.style.display = "none";
      // weapon bar can stay for mouse users if desired
      return;
    }

    // Show touch UI
    if (moveZone) moveZone.style.display = "block";
    if (aimZone) aimZone.style.display = "block";
    if (abilityBtn) abilityBtn.style.display = "block";
    if (weaponBar) weaponBar.style.display = "flex";

    if (!moveZone || !moveStick || !aimZone || !aimStick) return;

    var moveKnob = moveStick.querySelector(".joystick-knob");
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
        // Attack = true when finger is beyond dead zone
        Input.setTouchAim(angle, dist >= DEAD_ZONE);
      },
      function () { Input.clearTouchAim(); }
    );

    // Prevent body scroll while in game
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  return { init: init };
})();
