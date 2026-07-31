/**
 * engine/touch-controls.js
 * Floating dual joysticks — position relative to #game-screen.
 * Left half = move, Right half = aim + attack.
 */
var TouchControls = (function () {
  var MAX_RADIUS = 54;
  var DEAD_ZONE = 12;
  var gameScreen = null;

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
    var originX = 0;
    var originY = 0;

    function showAt(clientX, clientY) {
      // Position relative to #game-screen (joystick parent)
      var parent = gameScreen || document.getElementById("game-screen");
      if (!parent) return;
      var prect = parent.getBoundingClientRect();
      var x = clientX - prect.left;
      var y = clientY - prect.top;
      // Clamp inside screen with margin
      x = Math.max(50, Math.min(prect.width - 50, x));
      y = Math.max(50, Math.min(prect.height - 50, y));
      joystickEl.style.left = x + "px";
      joystickEl.style.top = y + "px";
      joystickEl.style.opacity = "1";
    }

    function moveKnob(dx, dy) {
      // Knob is centered; translate by finger delta (clamped)
      knobEl.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
    }

    function resetKnob() {
      knobEl.style.transform = "translate(-50%, -50%)";
    }

    function reset() {
      touchId = null;
      joystickEl.style.opacity = "0";
      resetKnob();
      onEnd();
    }

    zoneEl.addEventListener("touchstart", function (e) {
      if (touchId !== null) return;
      var target = e.target;
      if (target && (
        target.id === "btn-ability" ||
        (target.closest && (target.closest(".weapon-bar") || target.closest(".ability-btn")))
      )) {
        return;
      }
      var t = e.changedTouches[0];
      touchId = t.identifier;
      originX = t.clientX;
      originY = t.clientY;
      showAt(originX, originY);
      resetKnob();
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

    function handleEnd(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          reset();
          break;
        }
      }
    }
    zoneEl.addEventListener("touchend", handleEnd, { passive: false });
    zoneEl.addEventListener("touchcancel", handleEnd, { passive: false });
  }

  function init() {
    gameScreen = document.getElementById("game-screen");
    var moveZone = document.getElementById("touch-zone-move");
    var moveStick = document.getElementById("joystick-move");
    var aimZone = document.getElementById("touch-zone-aim");
    var aimStick = document.getElementById("joystick-aim");
    var abilityBtn = document.getElementById("btn-ability");
    var weaponBar = document.getElementById("weapon-bar");

    if (!isCoarsePointer()) {
      if (moveZone) moveZone.style.display = "none";
      if (aimZone) aimZone.style.display = "none";
      if (moveStick) moveStick.style.display = "none";
      if (aimStick) aimStick.style.display = "none";
      return;
    }

    if (moveZone) moveZone.style.display = "block";
    if (aimZone) aimZone.style.display = "block";
    if (abilityBtn) abilityBtn.style.display = "block";
    if (weaponBar) weaponBar.style.display = "flex";
    if (moveStick) moveStick.style.display = "block";
    if (aimStick) aimStick.style.display = "block";

    if (!moveZone || !moveStick || !aimZone || !aimStick) return;

    var moveKnob = moveStick.querySelector(".joystick-knob");
    var aimKnob = aimStick.querySelector(".joystick-knob");

    // Ensure knob default transform is centered
    if (moveKnob) moveKnob.style.transform = "translate(-50%, -50%)";
    if (aimKnob) aimKnob.style.transform = "translate(-50%, -50%)";

    setupZone(moveZone, moveStick, moveKnob,
      function (dx, dy, dist) {
        if (dist < DEAD_ZONE) Input.setTouchMove(0, 0);
        else Input.setTouchMove(dx / MAX_RADIUS, dy / MAX_RADIUS);
      },
      function () { Input.clearTouchMove(); }
    );

    setupZone(aimZone, aimStick, aimKnob,
      function (dx, dy, dist) {
        Input.setTouchAim(Math.atan2(dy, dx), dist >= DEAD_ZONE);
      },
      function () { Input.clearTouchAim(); }
    );
  }

  return { init: init };
})();
