/**
 * auth.js — Privy REQUIRED to play.
 * App ID: cmsbqsb7s01rx0djo13n8wy9b
 */
var Auth = (function () {
  "use strict";

  var PRIVY_CONFIG = {
    appId: "cmsbqsb7s01rx0djo13n8wy9b",
    clientId: ""
  };

  var privy = null;
  var user = null;
  var ready = false;
  var listeners = [];

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i]({ ready: ready, user: user, authenticated: !!user }); }
      catch (e) { console.warn("[Auth] listener", e); }
    }
  }

  function onChange(fn) {
    listeners.push(fn);
    if (ready) fn({ ready: ready, user: user, authenticated: !!user });
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  function isConfigured() {
    return !!(PRIVY_CONFIG.appId && PRIVY_CONFIG.appId !== "YOUR_PRIVY_APP_ID");
  }

  function getDisplayName() {
    if (!user) return null;
    if (user.email && user.email.address) return user.email.address.split("@")[0].slice(0, 12);
    if (user.google && user.google.name) return String(user.google.name).split(" ")[0].slice(0, 12);
    if (user.twitter && user.twitter.username) return String(user.twitter.username).slice(0, 12);
    if (user.wallet && user.wallet.address) return user.wallet.address.slice(0, 6) + "…" + user.wallet.address.slice(-4);
    if (user.id) return "Hunter_" + String(user.id).slice(-4);
    return "Hunter";
  }

  function getUserId() {
    return user && user.id ? user.id : null;
  }

  async function loadSdk() {
    if (privy) return privy;
    var mod = await import("https://esm.sh/@privy-io/js-sdk-core@0.68.5");
    var PrivyCtor = mod.default || mod.Privy;
    var LocalStorage = mod.LocalStorage;
    privy = new PrivyCtor({
      appId: PRIVY_CONFIG.appId,
      clientId: PRIVY_CONFIG.clientId || undefined,
      storage: LocalStorage ? new LocalStorage() : undefined
    });
    await privy.initialize();
    return privy;
  }

  async function init() {
    if (!isConfigured()) {
      console.warn("[Auth] Privy not configured");
      ready = true;
      notify();
      updateUI();
      return;
    }
    try {
      await loadSdk();
      if (privy.user && typeof privy.user.get === "function") {
        var res = await privy.user.get();
        user = res && res.user ? res.user : null;
      }
    } catch (err) {
      console.error("[Auth] init", err);
    }
    ready = true;
    notify();
    updateUI();
    if (user && typeof UserStore !== "undefined" && UserStore.ensureProfile) {
      UserStore.ensureProfile({ privyId: getUserId(), displayName: getDisplayName() });
    }
  }

  async function login() {
    if (!isConfigured()) {
      alert("Configura PRIVY_CONFIG.appId en js/auth.js (dashboard.privy.io)");
      return null;
    }
    try {
      await loadSdk();
      var email = window.prompt("Email to enter Robin's Arena:");
      if (!email) return null;
      email = email.trim();
      if (!email) return null;

      if (!privy.auth || !privy.auth.email || !privy.auth.email.sendCode) {
        alert("Enable Email login in Privy Dashboard → Authentication methods.");
        return null;
      }

      await privy.auth.email.sendCode(email);
      var code = window.prompt("Enter the code sent to " + email);
      if (!code) return null;

      var loginRes = await privy.auth.email.loginWithCode(email, code.trim());
      user = loginRes && loginRes.user ? loginRes.user : loginRes;

      notify();
      updateUI();

      if (typeof UserStore !== "undefined" && UserStore.ensureProfile) {
        await UserStore.ensureProfile({
          privyId: getUserId(),
          displayName: getDisplayName()
        });
      }
      applyNameToLobby();
      return user;
    } catch (err) {
      console.error("[Auth] login", err);
      alert("Login failed: " + (err && err.message ? err.message : err));
      return null;
    }
  }

  async function logout() {
    try {
      if (privy && privy.auth && privy.auth.logout) await privy.auth.logout();
    } catch (e) {}
    user = null;
    notify();
    updateUI();
  }

  function updateUI() {
    var gate = document.getElementById("auth-gate");
    var btnLogin = document.getElementById("btn-auth-login");
    var btnLogout = document.getElementById("btn-auth-logout");
    var label = document.getElementById("auth-user-label");
    var setupMsg = document.getElementById("auth-setup-msg");
    var authed = !!user;
    var configured = isConfigured();

    if (gate) gate.classList.toggle("hidden", authed);
    if (btnLogin) btnLogin.classList.toggle("hidden", authed);
    if (btnLogout) btnLogout.classList.toggle("hidden", !authed);
    if (label) {
      label.textContent = authed ? ("👤 " + (getDisplayName() || "Hunter")) : "";
      label.classList.toggle("hidden", !authed);
    }
    if (setupMsg) setupMsg.classList.toggle("hidden", configured);

    ["btn-solo", "btn-host", "btn-join-open"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.disabled = !authed;
        el.classList.toggle("auth-locked", !authed);
      }
    });
  }

  function applyNameToLobby() {
    var input = document.getElementById("player-name");
    if (!input || !user) return;
    var name = getDisplayName();
    if (name) input.value = name;
  }

  onChange(function (s) {
    if (s.authenticated) applyNameToLobby();
  });

  var api = {
    init: init,
    login: login,
    logout: logout,
    onChange: onChange,
    getUser: function () { return user; },
    getUserId: getUserId,
    getDisplayName: getDisplayName,
    isReady: function () { return ready; },
    isAuthenticated: function () { return !!user; },
    isConfigured: isConfigured,
    updateUI: updateUI,
    requireAuth: function () {
      if (!user) {
        alert("Login required to play Robin's Arena.");
        login();
        return false;
      }
      return true;
    }
  };

  if (typeof window !== "undefined") window.Auth = api;
  return api;
})();
