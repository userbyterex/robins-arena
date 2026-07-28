/**
 * main.js — Lobby with Class Selection + Pixel Character Creator.
 */
(function () {
  var selectedClass = "warrior";
  var selectedColor = 0;
  var appearance = { skin: "#f5d0a9", hair: "#1a1a1a", cloth: "#c0392b", accent: "#c9a227" };

  function $(id) { return document.getElementById(id); }

  function initCharacterCreator() {
    var skinRow = $("skin-row");
    var hairRow = $("hair-row");
    var clothRow = $("cloth-row");
    var preview = $("char-preview");

    function updatePreview() {
      if (!window.PixelCharacter) return;
      var canvas = PixelCharacter.generate(selectedClass, appearance);
      preview.innerHTML = "";
      var img = document.createElement("img");
      img.src = canvas.toDataURL();
      img.style.width = "96px";
      img.style.height = "96px";
      img.style.imageRendering = "pixelated";
      preview.appendChild(img);
    }

    function makeColorButton(color, container, key) {
      var btn = document.createElement("button");
      btn.className = "color-btn" + (appearance[key] === color ? " active" : "");
      btn.style.backgroundColor = color;
      btn.onclick = function () {
        appearance[key] = color;
        Array.from(container.children).forEach(function (c) { c.classList.remove("active"); });
        btn.classList.add("active");
        updatePreview();
      };
      container.appendChild(btn);
    }

    function populateColors() {
      skinRow.innerHTML = "<label>Skin:</label>";
      hairRow.innerHTML = "<label>Hair:</label>";
      clothRow.innerHTML = "<label>Cloth:</label>";
      PixelCharacter.getSkinTones().forEach(function (c) { makeColorButton(c, skinRow, "skin"); });
      PixelCharacter.getHairColors().forEach(function (c) { makeColorButton(c, hairRow, "hair"); });
      PixelCharacter.getClothColors().forEach(function (c) { makeColorButton(c, clothRow, "cloth"); });
      updatePreview();
    }

    var classCards = document.querySelectorAll(".class-card");
    classCards.forEach(function (card) {
      card.addEventListener("click", function () {
        classCards.forEach(function (c) { c.classList.remove("selected"); });
        card.classList.add("selected");
        selectedClass = card.dataset.class;
        updatePreview();
      });
    });

    populateColors();
  }

  function startGame(isHost, isSolo) {
    var playerName = ($("player-name") && $("player-name").value.trim()) || "Player";
    var configs = [];
    var myId = isSolo ? "solo-player" : (isHost ? "host" : "client");

    configs.push({
      id: myId,
      name: playerName,
      colorIndex: selectedColor,
      team: 0,
      classId: selectedClass,
      appearance: appearance,
    });

    if (isSolo) {
      var botClasses = ["warrior", "ranger", "mage", "healer"];
      for (var i = 1; i < 8; i++) {
        configs.push({
          id: "bot-" + i,
          name: "Bot " + i,
          colorIndex: i % 4,
          team: i % 2,
          classId: botClasses[i % 4],
          appearance: {
            skin: PixelCharacter.getSkinTones()[i % 10],
            hair: PixelCharacter.getHairColors()[i % 10],
            cloth: PixelCharacter.getClothColors()[i % 10],
            accent: PixelCharacter.getClothColors()[(i + 3) % 10],
          },
        });
      }
    }

    $("lobby-screen").style.display = "none";
    $("game-screen").style.display = "block";

    Game.init({
      canvas: $("game-canvas"),
      localPlayerId: myId,
      isHost: isHost,
      isSolo: isSolo,
      playerConfigs: configs,
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    initCharacterCreator();

    $("btn-solo").addEventListener("click", function () { startGame(false, true); });
    $("btn-host").addEventListener("click", function () { startGame(true, false); });
    $("btn-join").addEventListener("click", function () {
      alert("Join via invite code (placeholder — use Host Game for now)");
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        Game.stop();
        $("game-screen").style.display = "none";
        $("lobby-screen").style.display = "block";
      }
    });
  });
})();
