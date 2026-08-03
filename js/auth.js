/**
 * auth.js — Privy email OTP integrated in lobby UI
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
  var pendingEmail = "";

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
    return typeof APP_ID === "string" && APP_ID.length > 10 && APP_ID.indexOf("YOUR_") !== 0;
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

  function setMsg(text, isError) {
    var el = document.getElementById("auth-msg");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("error", !!isError);
  }

  function showEmailStep() {
    var a = document.getElementById("auth-step-email");
    var b = document.getElementById("auth-step-code");
    if (a) a.classList.remove("hidden");
    if (b) b.classList.add("hidden");
  }

  function showCodeStep(email) {
    var a = document.getElementById("auth-step-email");
    var b = document.getElementById("auth-step-code");
    var shown = document.getElementById("auth-email-shown");
    if (a) a.classList.add("hidden");
    if (b) b.classList.remove("hidden");
    if (shown) shown.textContent = email;
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

  function updateUI() {
    var gate = document.getElementById("auth-gate");
    var btnLogout = document.getElementById("btn-auth-logout");
    var label = document.getElementById("auth-user-label");
    var setupMsg = document.getElementById("auth-setup-msg");
    var authed = !!user;
    var configured = isConfigured();

    if (gate) gate.classList.toggle("hidden", authed);
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

  function init() {
    console.log("[Auth] init", APP_ID);
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
        setMsg("Auth init issue — try Send code", true);
      })
      .then(function () {
        ready = true;
        notify();
        updateUI();
        if (user && global.UserStore && UserStore.ensureProfile) {
          UserStore.ensureProfile({ privyId: getUserId(), displayName: getDisplayName() });
        }
        if (user) applyNameToLobby();
      });
  }

  function sendCode() {
    if (!isConfigured()) {
      setMsg("Missing App ID", true);
      return Promise.resolve(null);
    }
    var input = document.getElementById("auth-email");
    var email = input ? input.value.trim() : "";
    if (!email || email.indexOf("@") < 1) {
      setMsg("Enter a valid email", true);
      return Promise.resolve(null);
    }

    var sendBtn = document.getElementById("btn-auth-send");
    if (sendBtn) sendBtn.disabled = true;
    setMsg("Sending code…");
    pendingEmail = email;

    return loadSdk()
      .then(function () {
        if (!privy.auth || !privy.auth.email || !privy.auth.email.sendCode) {
          setMsg("Enable Email login in Privy Dashboard", true);
          return null;
        }
        return privy.auth.email.sendCode(email).then(function () {
          showCodeStep(email);
          setMsg("Open your email, copy the code, come back here. Keep this tab open.");
          var codeInput = document.getElementById("auth-code");
          if (codeInput) {
            codeInput.value = "";
            setTimeout(function () { codeInput.focus(); }, 100);
          }
        });
      })
      .catch(function (err) {
        console.error("[Auth] sendCode", err);
        setMsg("Send failed: " + (err && err.message ? err.message : String(err)), true);
      })
      .then(function () {
        if (sendBtn) sendBtn.disabled = false;
      });
  }

  function verifyCode() {
    var codeInput = document.getElementById("auth-code");
    var code = codeInput ? codeInput.value.trim() : "";
    if (!pendingEmail) {
      showEmailStep();
      setMsg("Enter email first", true);
      return Promise.resolve(null);
    }
    if (!code) {
      setMsg("Enter the code from your email", true);
      return Promise.resolve(null);
    }

    var verifyBtn = document.getElementById("btn-auth-verify");
    if (verifyBtn) verifyBtn.disabled = true;
    setMsg("Verifying…");

    return loadSdk()
      .then(function () {
        return privy.auth.email.loginWithCode(pendingEmail, code);
      })
      .then(function (loginRes) {
        user = loginRes && loginRes.user ? loginRes.user : loginRes;
        notify();
        updateUI();
        if (global.UserStore && UserStore.ensureProfile) {
          UserStore.ensureProfile({ privyId: getUserId(), displayName: getDisplayName() });
        }
        applyNameToLobby();
        setMsg("Welcome, " + (getDisplayName() || "Hunter") + "!");
        console.log("[Auth] logged in", getDisplayName());
        return user;
      })
      .catch(function (err) {
        console.error("[Auth] verify", err);
        setMsg("Invalid or expired code. Try again.", true);
        return null;
      })
      .then(function (result) {
        if (verifyBtn) verifyBtn.disabled = false;
        return result;
      });
  }

  function login() {
    var gate = document.getElementById("auth-gate");
    if (gate) gate.classList.remove("hidden");
    showEmailStep();
    setMsg("Enter your email to continue");
    var input = document.getElementById("auth-email");
    if (input) input.focus();
    return Promise.resolve(null);
  }

  function logout() {
    var p = Promise.resolve();
    try {
      if (privy && privy.auth && privy.auth.logout) p = privy.auth.logout();
    } catch (e) {}
    return Promise.resolve(p).then(function () {
      user = null;
      pendingEmail = "";
      showEmailStep();
      setMsg("");
      notify();
      updateUI();
    });
  }

  function wireForm() {
    var sendBtn = document.getElementById("btn-auth-send");
    var verifyBtn = document.getElementById("btn-auth-verify");
    var backBtn = document.getElementById("btn-auth-back-email");
    var emailInput = document.getElementById("auth-email");
    var codeInput = document.getElementById("auth-code");

    if (sendBtn) sendBtn.addEventListener("click", function () { sendCode(); });
    if (verifyBtn) verifyBtn.addEventListener("click", function () { verifyCode(); });
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        showEmailStep();
        setMsg("");
      });
    }
    if (emailInput) {
      emailInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          sendCode();
        }
      });
    }
    if (codeInput) {
      codeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          verifyCode();
        }
      });
    }
  }

  onChange(function (s) {
    if (s.authenticated) applyNameToLobby();
  });

  var api = {
    init: init,
    login: login,
    logout: logout,
    sendCode: sendCode,
    verifyCode: verifyCode,
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
        login();
        setMsg("Login required to play", true);
        return false;
      }
      return true;
    }
  };

  global.Auth = api;
  console.log("[Auth] ready, appId=", APP_ID);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireForm);
  } else {
    wireForm();
  }
})(typeof window !== "undefined" ? window : this);
