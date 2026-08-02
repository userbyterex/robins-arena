/**
 * ranking.js — Local leaderboard panel.
 */
var Ranking = (function () {
  "use strict";

  function open() {
    var panel = document.getElementById("ranking-panel");
    if (!panel) return;
    panel.classList.remove("hidden");
    render();
  }

  function close() {
    var panel = document.getElementById("ranking-panel");
    if (panel) panel.classList.add("hidden");
  }

  function render() {
    var list = document.getElementById("ranking-list");
    var you = document.getElementById("ranking-you");
    if (!list) return;
    var board = [];
    try { board = JSON.parse(localStorage.getItem("ra_ranking_v1") || "[]"); } catch (e) {}
    list.innerHTML = "";
    if (!board.length) {
      list.innerHTML = "<li class='ranking-empty'>No ranked matches yet. Play a game!</li>";
    } else {
      board.slice(0, 20).forEach(function (r, i) {
        var li = document.createElement("li");
        li.innerHTML = "<span class='rank'>#" + (i + 1) + "</span> " +
          "<span class='name'>" + (r.displayName || "?") + "</span> " +
          "<span class='score'>" + (r.rating || 0) + " · " + (r.wins || 0) + "W</span>";
        list.appendChild(li);
      });
    }
    if (you && typeof UserStore !== "undefined") {
      var p = UserStore.getProfile();
      you.textContent = "You: " + (p.displayName || "?") + " · " + (p.rating || 1000) + " rating · " + (p.wins || 0) + "W / " + (p.matches || 0) + " matches";
    }
  }

  if (typeof window !== "undefined") window.Ranking = { open: open, close: close, render: render };
  return window.Ranking;
})();
