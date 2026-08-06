/**
 * ability-input.js — 3 skills + ULT
 */
var AbilityInput = (function () {
  console.log("[AbilityInput] loading…");

  var skillPressed = [false, false, false];
  var ultPressed = false;
  var barEl = null;
  var buttons = [];
  var ultBtn = null;
  var localClassId = "warrior";

  function ensureBar() {
    barEl = document.getElementById("ability-bar");
    if (!barEl) {
      barEl = document.createElement("div");
      barEl.id = "ability-bar";
      barEl.className = "ability-bar";
      var game = document.getElementById("game-screen");
      if (game) game.appendChild(barEl);
      else document.body.appendChild(barEl);
    }
    barEl.innerHTML = "";
    buttons = [];

    for (var i = 0; i < 3; i++) {
      (function (idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skill-btn";
        btn.dataset.skill = String(idx);
        btn.innerHTML = '<span class="skill-icon">•</span><span class="skill-cd"></span>';
        function press(e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          skillPressed[idx] = true;
        }
        btn.addEventListener("touchstart", press, { passive: false });
        btn.addEventListener("mousedown", press);
        barEl.appendChild(btn);
        buttons.push(btn);
      })(i);
    }

    ultBtn = document.getElementById("btn-ability");
    if (ultBtn) {
      ultBtn.classList.add("ult-btn");
      function pressUlt(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        ultPressed = true;
      }
      ultBtn.addEventListener("touchstart", pressUlt, { passive: false });
      ultBtn.addEventListener("mousedown", pressUlt);
    }
  }

  function setClass(classId) {
    localClassId = classId || "warrior";
    var cls = typeof getClass === "function" ? getClass(localClassId) : null;
    if (!cls) return;
    for (var i = 0; i < 3; i++) {
      var sk = cls.skills && cls.skills[i];
      if (buttons[i] && sk) {
        var icon = buttons[i].querySelector(".skill-icon");
        if (icon) icon.textContent = sk.icon || "•";
        buttons[i].title = (sk.name || "") + " — " + (sk.desc || "");
        buttons[i].classList.toggle("is-basic", !!sk.isBasic || sk.cooldown === 0);
      }
    }
    if (ultBtn && cls.ability) {
      ultBtn.innerHTML = '<span class="ult-icon">' + (cls.ability.icon || "ULT") + "</span>";
      ultBtn.title = (cls.ability.name || "ULT") + " — " + (cls.ability.desc || "");
    }
  }

  function setCooldowns(cds, ultimateCharge) {
    var now = performance.now() / 1000;
    for (var i = 0; i < 3; i++) {
      if (!buttons[i]) continue;
      var until = (cds && cds[i] != null) ? cds[i] : 0;
      var left = (until > 0) ? Math.max(0, until - now) : 0;
      var cdEl = buttons[i].querySelector(".skill-cd");
      if (left > 0.05) {
        buttons[i].classList.add("on-cd");
        if (cdEl) cdEl.textContent = left.toFixed(1);
      } else {
        buttons[i].classList.remove("on-cd");
        if (cdEl) cdEl.textContent = "";
      }
    }
    var ready = (ultimateCharge || 0) >= 100;
    if (ultBtn) {
      ultBtn.classList.toggle("ult-ready", ready);
      ultBtn.classList.toggle("ult-charging", !ready);
    }
  }

  function consumeSkills() {
    var out = {
      skill0: skillPressed[0],
      skill1: skillPressed[1],
      skill2: skillPressed[2],
      ultimate: ultPressed
    };
    skillPressed[0] = skillPressed[1] = skillPressed[2] = false;
    ultPressed = false;
    return out;
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (e.code === "Digit1" || e.key === "1") skillPressed[0] = true;
    if (e.code === "Digit2" || e.key === "2") skillPressed[1] = true;
    if (e.code === "Digit3" || e.key === "3") skillPressed[2] = true;
    if (e.code === "Space") {
      e.preventDefault();
      ultPressed = true;
    }
  }

  function init() {
    ensureBar();
    window.addEventListener("keydown", onKeyDown);
    setClass(localClassId);
  }

  return {
    init: init,
    setClass: setClass,
    setCooldowns: setCooldowns,
    consumeSkills: consumeSkills
  };
})();
