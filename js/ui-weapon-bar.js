/**
 * ui-weapon-bar.js
 * Botones reales de HTML para elegir arma: funcionan igual con tap (móvil)
 * que con clic de mouse (PC), además de las teclas 1-5 que sigue manejando
 * engine/input.js.
 */
const WeaponBar = (() => {
  let buttons = {};

  function init(container, onSelect) {
    container.innerHTML = "";
    buttons = {};
    WEAPON_ORDER.forEach((wid, i) => {
      const w = WEAPONS[wid];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "weapon-btn";
      btn.setAttribute("aria-label", w.name);
      btn.innerHTML = `<span class="weapon-icon">${w.icon}</span><span class="weapon-key">${i + 1}</span>`;
      btn.addEventListener("click", () => onSelect(wid));
      container.appendChild(btn);
      buttons[wid] = btn;
    });
  }

  function setActive(weaponId) {
    for (const [wid, btn] of Object.entries(buttons)) {
      btn.classList.toggle("active", wid === weaponId);
    }
  }

  return { init, setActive };
})();
