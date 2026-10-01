(function () {
  "use strict";
  // Confirmation callbacks can include tokens. Discard them: users sign in
  // explicitly, and tokens must not remain in history or outgoing links.
  if (window.location.hash && /(?:access_token|refresh_token)=/.test(window.location.hash)) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  var config = window.ONEL_AUTH_CONFIG || {};
  var status = document.getElementById("accountStatus");
  var form = document.getElementById("accountForm");
  var fields = document.getElementById("accountFields");
  var switchButton = document.getElementById("accountSwitch");
  var submitButton = document.getElementById("accountSubmit");
  var signOut = document.getElementById("accountSignOut");
  var password = document.getElementById("password");
  var confirmation = document.getElementById("confirmPassword");
  var signup = true;
  var busy = false;
  var url;
  try { url = new URL(config.supabaseUrl); } catch (_) {}
  if (!url || url.protocol !== "https:" || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || !config.publishableKey) {
    status.textContent = "Account registration is not available yet. Please contact us by email.";
    return;
  }
  var base = url.origin + "/auth/v1";
  var accessToken = null; // In memory only; never persist passwords or tokens.
  function message(text) { status.textContent = text; }
  function mode() {
    confirmation.hidden = !signup;
    confirmation.required = signup;
    confirmation.setCustomValidity("");
    document.getElementById("confirmLabel").hidden = !signup;
    password.autocomplete = signup ? "new-password" : "current-password";
    password.minLength = signup ? 12 : 1;
    document.getElementById("passwordHint").hidden = !signup;
    submitButton.textContent = signup ? "Create account" : "Sign in";
    switchButton.textContent = signup ? "Already have an account? Sign in" : "Need an account? Create one";
  }
  async function request(path, body, token) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(base + path, {
        method: "POST", signal: controller.signal, credentials: "omit",
        headers: { "Content-Type": "application/json", apikey: config.publishableKey,
          Authorization: "Bearer " + (token || config.publishableKey) },
        body: JSON.stringify(body)
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        var error = new Error("Authentication failed");
        error.status = response.status;
        error.code = data.error_code || data.code;
        throw error;
      }
      return data;
    } finally { clearTimeout(timeout); }
  }
  form.hidden = false;
  switchButton.hidden = false;
  message("Verify your email to finish creating your account.");
  switchButton.addEventListener("click", function () {
    if (busy) return;
    signup = !signup;
    password.value = "";
    confirmation.value = "";
    mode();
    message(signup ? "Verify your email to finish creating your account." : "Sign in with your verified email and password.");
  });
  confirmation.addEventListener("input", function () { confirmation.setCustomValidity(""); });
  password.addEventListener("input", function () { confirmation.setCustomValidity(""); });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy) return;
    if (signup && confirmation.value !== password.value) {
      confirmation.setCustomValidity("The passwords must match.");
      confirmation.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    busy = true;
    fields.disabled = true;
    switchButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    message(signup ? "Creating your account…" : "Signing in…");
    try {
      var data = await request(signup ? "/signup" : "/token?grant_type=password", {
        email: document.getElementById("email").value.trim(), password: password.value
      });
      password.value = "";
      confirmation.value = "";
      if (data.access_token) {
        accessToken = data.access_token;
        form.hidden = true;
        switchButton.hidden = true;
        signOut.hidden = false;
        message("You are signed in. Your website account does not grant access to DroneOS.");
      } else if (signup) {
        message("Check your inbox for a verification email. If this address already has an account, sign in or contact us for help.");
        signup = false;
        mode();
      } else { message("Sign-in could not be completed. Please try again."); }
    } catch (error) {
      if (error.status === 429) message("Too many attempts. Please wait a few minutes and try again.");
      else if (error.code === "email_not_confirmed") message("Verify your email before signing in.");
      else if (error.status === 400 || error.status === 422) message(signup ? "Registration could not be completed. Check your details, use a stronger password, or contact us." : "Sign-in failed. Check your email and password.");
      else message("The account service could not be reached. Please try again later.");
    } finally {
      busy = false; fields.disabled = false; switchButton.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
  signOut.addEventListener("click", async function () {
    if (busy) return;
    busy = true; signOut.disabled = true;
    try {
      await request("/logout", {}, accessToken);
      accessToken = null;
      signOut.hidden = true; form.hidden = false; switchButton.hidden = false;
      signup = false; mode(); message("You have signed out.");
    } catch (_) { message("Sign-out could not be completed. Try again, or close this page to clear this browser session."); }
    finally { busy = false; signOut.disabled = false; }
  });
})();
