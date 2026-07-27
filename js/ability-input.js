/**
 * ability-input.js — Space / Q / E / mobile button for class ability.
 * Load AFTER input.js, BEFORE game.js.
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
      e.preventDefault();
      pressed = true;
      edge = true;
    }
    function up(e) {
      e.preventDefault();
      pressed = false;
    }
    btn.addEventListener("touchstart", down, { passive: false });
    btn.addEventListener("touchend", up);
    btn.addEventListener("mousedown", down);
    btn.addEventListener("mouseup", up);
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
    },
  };
})();
