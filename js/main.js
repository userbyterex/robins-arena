/**
 * main.js — Lobby + class select (Warrior / Ranger / Mage / Monk).
 * Paste-safe.
 */
(function () {
  var panels = {
    name: document.getElementById("panel-name"),
    choice: document.getElementById("panel-choice"),
    join: document.getElementById("panel-join"),
    lobby: document.getElementById("panel-lobby"),
  };
  var screenLobby = document.getElementById("screen-lobby");
  var screenGame = document.getElementById("screen-game");
  var canvas = document.getElementById("game-canvas");

  var inputName = document.getElementById("input-name");
  var inputCode = document.getElementById("input-code");
  var roomCodeDisplay = document.getElementById("room-code-display");
  var lobbyStatus = document.getElementById("lobby-status");
  var playerRoster = document.getElementById("player-roster");
  var btnStart = document.getElementById("btn-start-game");
  var campList = document.getElementById("camp-list");
  var classPicker = document.getElementById("class-picker");

  var playerName = "";
  var isHost = false;
  var currentRoomCode = "";
  var lastRosterList = [];
  var selectedClass = "warrior";
  var playerClassMap = {};

  function showPanel(name) {
    Object.keys(panels).forEach(function (key) {
      if (panels[key]) panels[key].setAttribute("data-active", key === name ? "true" : "false");
    });
  }

  function showError(err) {
    var msg = err && err.message ? err.message : (typeof err === "string" ? err : "try again.");
    if (lobbyStatus) lobbyStatus.textContent = "Error: " + msg;
    console.error("Network error:", msg);
  }

  function buildClassPicker() {
    if (!classPicker) return;
    classPicker.innerHTML = "";
    var order = (typeof CLASS_ORDER !== "undefined") ? CLASS_ORDER : ["warrior", "ranger", "mage", "monk"];
    order.forEach(function (id) {
      var c = (typeof getClass === "function") ? getClass(id) : { id: id, name: id, icon: "?", tagline: "", color: "#888" };
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "class-btn" + (id === selectedClass ? " selected" : "");
      btn.setAttribute("data-class", id);
      btn.innerHTML = "<span class='class-icon'>" + (c.icon || "?") + "</span>" +
        "<span class='class-name'>" + (c.name || id) + "</span>" +
        "<span class='class-tag'>" + (c.tagline || "") + "</span>";
      btn.style.borderColor = c.color || "#888";
      btn.addEventListener("click", function () {
        selectedClass = id;
        var
