/**
 * user-store.js — Local profile + stats (localStorage).
 */
var UserStore = (function () {
  "use strict";
  var LS_KEY = "ra_user_profile_v1";

  function emptyProfile(partial) {
    return {
      privyId: (partial && partial.privyId) || null,
      displayName: (partial && partial.displayName) || "Hunter",
      wins: 0, losses: 0, kills: 0, deaths: 0, captures: 0,
      matches: 0, rating: 1000, updatedAt: Date.now()
    };
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return emptyProfile();
      return Object.assign(emptyProfile(), JSON.parse(raw));
    } catch (e) { return emptyProfile(); }
  }

  function saveLocal(profile) {
    profile.updatedAt = Date.now();
    try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch (e) {}
    return profile;
  }

  function ensureProfile(opts) {
    var p = loadLocal();
    if (opts && opts.privyId) p.privyId = opts.privyId;
    if (opts && opts.displayName) p.displayName = opts.displayName;
    return saveLocal(p);
  }

  function getProfile() { return loadLocal(); }

  function recordMatch(result) {
    var p = loadLocal();
    p.matches = (p.matches || 0) + 1;
    if (result && result.won) p.wins = (p.wins || 0) + 1;
    else p.losses = (p.losses || 0) + 1;
    if (result && result.kills) p.kills = (p.kills || 0) + result.kills;
    if (result && result.deaths) p.deaths = (p.deaths || 0) + result.deaths;
    if (result && result.captures) p.captures = (p.captures || 0) + result.captures;
    var delta = result && result.won ? 15 : -8;
    p.rating = Math.max(0, (p.rating || 1000) + delta);
    saveLocal(p);

    try {
      var board = JSON.parse(localStorage.getItem("ra_ranking_v1") || "[]");
      var row = {
        privyId: p.privyId,
        displayName: p.displayName,
        rating: p.rating,
        wins: p.wins,
        matches: p.matches,
        kills: p.kills
      };
      board = board.filter(function (r) { return r.privyId !== p.privyId; });
      board.push(row);
      board.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
      localStorage.setItem("ra_ranking_v1", JSON.stringify(board.slice(0, 50)));
    } catch (e) {}

    return p;
  }

  if (typeof window !== "undefined") window.UserStore = {
    ensureProfile: ensureProfile,
    getProfile: getProfile,
    recordMatch: recordMatch
  };
  return window.UserStore;
})();
