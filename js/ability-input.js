/**
 * ability-input.js — Space / Q / E + big mobile ULT button.
 * Landscape-friendly, prevents accidental scroll.
 */
(function () {
  var pressed = false;
  var edge = false;

  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.key === "q" || e.key === "Q" || e.key === "e" || e.key === "E") {
      if (!e.repeat) edge = true;
      pressed = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.code === "Space" || e.key === "q" || e.key === "Q" || e.key === "e" || e.key === "E") {
      pressed = false;
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("btn-ability");
    if (!btn) return;

    function down(e) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      pressed = true;
      edge = true;
      btn.classList.add("pressed");
    }
    function up(e) {
      if (e && e.preventDefault) e.preventDefault();
      pressed = false;
      btn.classList.remove("pressed");
    }

    // Prefer pointer events (covers mouse + touch)
    btn.addEventListener("pointerdown", down, { passive: false });
    btn.addEventListener("pointerup", up, { passive: false });
    btn.addEventListener("pointercancel", up, { passive: false });
    btn.addEventListener("pointerleave", up, { passive: false });

    // Fallback touch
    btn.addEventListener("touchstart", down, { passive: false });
    btn.addEventListener("touchend", up, { passive: false });
    btn.addEventListener("touchcancel", up, { passive: false });

    btn.style.touchAction = "manipulation";
    btn.style.webkitUserSelect = "none";
    btn.style.userSelect = "none";
  });

  window.AbilityInput = {
    consume: function () {
      if (edge) {
        edge = false;
        return true;
      }
      return false;
    },
    isDown: function () {
      return pressed;
    }
  };
})();
