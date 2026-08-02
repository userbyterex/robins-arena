/**
 * auth.js — Privy REQUIRED (classic script)
 * App ID: cmsbqsb7s01rx0djo13n8wy9b
 */
(function (global) {
  "use strict";

  var APP_ID = "cmsbqsb7s01rx0djo13n8wy9b";
  var CLIENT_ID = "";

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
    return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  function isConfigured() {
    var ok = typeof APP_ID === "string" && APP_ID.length > 10 && APP_ID.indexOf("YOUR_") !== 0;
    console.log("[Auth] isConfigured", ok, "appId=", APP_ID);
    return ok;
  }

  function getDisplayName() {
    if (!user) return null;
    if (user.email && user.email.address) return user.email.address.split("@")[0].slice(0, 12);
    if (user.google && user.google.name) return String(user.google.name).split(" ")[0].slice(0, 12);
    if (user.twitter && user.twitter.username) return String(user.twitter.username).slice(0, 12);
    if (user.wallet && user.wallet.address) {
      return user.wallet.address.slice(0, 6) + "…" + user.wallet.address.slice(-4);
    }
    if (user.id) return "Hunter_" + String(user.id).slice(-4);
    return "Hunter";
  }

  function getUserId() {
    return user && user.id ? user.id : null;
  }

  function loadSdk() {
    if (privy) return Promise.resolve(privy);
    return import("https://esm.sh/@privy-io/js-sdk-core@0.68.5").then(function (mod) {
      var PrivyCtor = mod.default || mod.Privy;
      var LocalStorage = mod.LocalStorage;
      var opts = { appId: APP_ID };
      if (CLIENT_ID) opts.clientId = CLIENT_ID;
      if (LocalStorage) opts.storage = new LocalStorage();
      privy = new PrivyCtor(opts);
      return privy.initialize().then(function () {
        console.log("[Auth] SDK ready");
        return privy;
      });
    });
  }

  function init() {
    console.log("[Auth] init start");
    if (!isConfigured()) {
      ready = true;
      notify();
      updateUI();
      return Promise.resolve();
    }
    return loadSdk()
      .then(function () {
        if (privy.user && typeof privy.user.get === "function") {
          return privy.user.get().then(function (res) {
            user = res && res.user ? res.user : null;
          });
        }
      })
      .catch(function (err) {
        console.error("[Auth] init error", err);
      })
      .then(function () {
        ready = true;
        notify();
        updateUI();
        if (user && global.UserStore && UserStore.ensureProfile) {
          UserStore.ensureProfile({ privyId: getUserId(), displayName: getDisplayName() });
        }
      });
  }

  function login() {
    if (!isConfigured()) {
      alert("Configura PRIVY_CONFIG.appId en js/auth.js (dashboard.privy.io)");
      return Promise.resolve(null);
    }
    return loadSdk()
      .then(function () {
        var email = window.prompt("Email to enter Robin's Arena:");
        if (!email) return null;
        email = email.trim();
        if (!email) return null;

        if (!privy.auth || !privy.auth.email || !privy.auth.email.sendCode) {
          alert("Enable Email login in Privy Dashboard → Authentication methods.");
          return null;
        }

        return privy.auth.email.sendCode(email).then(function () {
          var code = window.prompt("Enter the code sent to " + email);
          if (!code) return null;
          return privy.auth.email.loginWithCode(email, code.trim()).then(function (loginRes) {
            user = loginRes && loginRes.user ? loginRes.user : loginRes;
            notify();
            updateUI();
            if (global.UserStore && UserStore.ensureProfile) {
              UserStore.ensureProfile({ privyId: getUserId(), displayName: getDisplayName() });
            }
            applyNameToLobby();
            console.log("[Auth] logged in", getDisplayName());
            return user;
          });
        });
      })
      .catch(function (err) {
        console.error("[Auth] login failed", err);
        alert("Login failed: " + (err && err.message ? err.message : err));
        return null;
      });
  }

  function logout() {
    var p = Promise.resolve();
    try {
      if (privy && privy.auth && privy.auth.logout) p = privy.auth.logout();
    } catch (e) {}
    return Promise.resolve(p).then(function () {
      user = null;
      notify();
      updateUI();
    });
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

  global.Auth = api;
  console.log("[Auth] module attached, appId=", APP_ID);
})(typeof window !== "undefined" ? window : this);
