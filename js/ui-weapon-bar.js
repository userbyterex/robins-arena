/**
 * ui-weapon-bar.js
 * Botones reales de HTML para elegir arma. Funciona con táctil y ratón.
 */
var WeaponBar = (function () {
  var buttons = {};

  function init(container, onSelect) {
    container.innerHTML = "";
    buttons = {};
    WEAPON_ORDER.forEach(function (wid, i) {
      var w = WEAPONS[wid];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "weapon-btn";
      btn.setAttribute("aria-label", w.name);
      btn.innerHTML = w.icon + (i + 1);
      btn.style.touchAction = "manipulation";

      btn.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        onSelect(wid);
      });

      container.appendChild(btn);
      buttons[wid] = btn;
    });
  }

  function setActive(weaponId) {
    for (var wid in buttons) {
      buttons[wid].classList.toggle("active", wid === weaponId);
    }
  }

  return { init: init, setActive: setActive };
})();
