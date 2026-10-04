const elements = {
  loginPanel: document.querySelector("#loginPanel"),
  loginForm: document.querySelector("#loginForm"),
  passwordInput: document.querySelector("#passwordInput"),
  loginMessage: document.querySelector("#loginMessage"),
  dashboard: document.querySelector("#dashboard"),
  logoutButton: document.querySelector("#logoutButton"),
  systemStatus: document.querySelector("#systemStatus"),
  toggleSystemButton: document.querySelector("#toggleSystemButton"),
  settingsMessage: document.querySelector("#settingsMessage"),
  requestPasswordChangeForm: document.querySelector(
    "#requestPasswordChangeForm",
  ),
  requestPasswordStatus: document.querySelector("#requestPasswordStatus"),
  newRequestPasswordInput: document.querySelector("#newRequestPasswordInput"),
};

let storeConfigured = false;

elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
elements.toggleSystemButton.addEventListener("click", toggleSystem);
elements.requestPasswordChangeForm.addEventListener(
  "submit",
  changeRequestPassword,
);

loadDashboard();

async function login(event) {
  event.preventDefault();
  elements.loginMessage.textContent = "Checking...";

  try {
    await apiRequest("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: elements.passwordInput.value }),
    });
    elements.passwordInput.value = "";
    showDashboard();
    await loadDashboard();
  } catch (error) {
    elements.loginMessage.textContent = error.message;
  }
}

async function logout() {
  await apiRequest("/api/admin/logout", { method: "POST" });
  showLogin();
}

async function loadDashboard() {
  try {
    const data = await apiRequest("/api/admin/settings");
    showDashboard();
    renderSettings(data.settings);
  } catch (error) {
    if (error.status === 401) {
      showLogin();
      return;
    }

    showDashboard();
    elements.settingsMessage.textContent = error.message;
  }
}

async function toggleSystem() {
  const enabled = elements.toggleSystemButton.dataset.enabled !== "true";
  await updateSettings({ enabled });
}

async function changeRequestPassword(event) {
  event.preventDefault();
  const updated = await updateSettings({
    newRequestPassword: elements.newRequestPasswordInput.value,
  });

  if (updated) {
    elements.newRequestPasswordInput.value = "";
  }
}

async function updateSettings(body) {
  elements.settingsMessage.textContent = "Updating...";
  setSettingsDisabled(true);

  try {
    const data = await apiRequest("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    renderSettings(data.settings);
    elements.settingsMessage.textContent = "Updated";
    return true;
  } catch (error) {
    elements.settingsMessage.textContent = error.message;
    return false;
  } finally {
    setSettingsDisabled(!storeConfigured);
  }
}

function renderSettings(settings) {
  storeConfigured = settings.storeConfigured;
  elements.systemStatus.textContent = settings.enabled
    ? "Requests are open"
    : "Requests are closed";
  elements.toggleSystemButton.dataset.enabled = String(settings.enabled);
  elements.toggleSystemButton.textContent = settings.enabled
    ? "Close Requests"
    : "Open Requests";
  elements.requestPasswordChangeForm.hidden = !storeConfigured;
  setSettingsDisabled(!storeConfigured);
  elements.requestPasswordStatus.textContent = `Current: ${
    settings.requestPassword || "Not set"
  }`;

  if (!storeConfigured) {
    elements.settingsMessage.textContent =
      "Connect Private Blob to enable settings";
  }
}

function setSettingsDisabled(disabled) {
  elements.toggleSystemButton.disabled = disabled;

  for (const control of elements.requestPasswordChangeForm.elements) {
    control.disabled = disabled;
  }
}

function showLogin() {
  elements.loginPanel.hidden = false;
  elements.dashboard.hidden = true;
  elements.logoutButton.hidden = true;
}

function showDashboard() {
  elements.loginPanel.hidden = true;
  elements.dashboard.hidden = false;
  elements.logoutButton.hidden = false;
  elements.loginMessage.textContent = "";
}

async function apiRequest(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}
