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
  passwordChangeForm: document.querySelector("#passwordChangeForm"),
  currentPasswordInput: document.querySelector("#currentPasswordInput"),
  newPasswordInput: document.querySelector("#newPasswordInput"),
  refreshButton: document.querySelector("#refreshButton"),
  nowPlaying: document.querySelector("#nowPlaying"),
  playlistHeader: document.querySelector("#playlistHeader"),
  playlistTracks: document.querySelector("#playlistTracks"),
};

let refreshTimer = null;

elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
elements.toggleSystemButton.addEventListener("click", toggleSystem);
elements.passwordChangeForm.addEventListener("submit", changePassword);
elements.refreshButton.addEventListener("click", loadDashboard);

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
  const [settings, nowPlaying, playlist] = await Promise.allSettled([
    apiRequest("/api/admin/settings"),
    apiRequest("/api/admin/now-playing"),
    apiRequest("/api/admin/playlist"),
  ]);
  const authError = [settings, nowPlaying, playlist].find(
    (result) => result.status === "rejected" && result.reason.status === 401,
  );

  if (authError) {
    showLogin();
    return;
  }

  showDashboard();

  if (settings.status === "fulfilled") {
    renderSettings(settings.value.settings);
  } else {
    elements.settingsMessage.textContent = settings.reason.message;
  }

  if (nowPlaying.status === "fulfilled") {
    renderNowPlaying(nowPlaying.value.track);
  } else {
    renderPanelError(elements.nowPlaying, nowPlaying.reason.message);
  }

  if (playlist.status === "fulfilled") {
    renderPlaylist(playlist.value.playlist);
  } else {
    renderPanelError(elements.playlistHeader, playlist.reason.message);
    elements.playlistTracks.replaceChildren();
  }
}

async function toggleSystem() {
  const enabled = elements.toggleSystemButton.dataset.enabled !== "true";
  await updateSettings({ enabled });
}

async function changePassword(event) {
  event.preventDefault();
  await updateSettings({
    currentPassword: elements.currentPasswordInput.value,
    newPassword: elements.newPasswordInput.value,
  });
  elements.currentPasswordInput.value = "";
  elements.newPasswordInput.value = "";
}

async function updateSettings(body) {
  elements.settingsMessage.textContent = "Updating...";
  elements.toggleSystemButton.disabled = true;

  try {
    const data = await apiRequest("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    renderSettings(data.settings);
    elements.settingsMessage.textContent = "Updated";
  } catch (error) {
    elements.settingsMessage.textContent = error.message;
  } finally {
    elements.toggleSystemButton.disabled = elements.passwordChangeForm.hidden;
  }
}

function renderSettings(settings) {
  elements.systemStatus.textContent = settings.enabled
    ? "Requests are open"
    : "Requests are closed";
  elements.toggleSystemButton.dataset.enabled = String(settings.enabled);
  elements.toggleSystemButton.textContent = settings.enabled
    ? "Close Requests"
    : "Open Requests";
  elements.toggleSystemButton.disabled = !settings.storeConfigured;
  elements.passwordChangeForm.hidden = !settings.storeConfigured;

  if (!settings.storeConfigured) {
    elements.settingsMessage.textContent = "Connect Redis to enable settings";
  }
}

function showLogin() {
  clearInterval(refreshTimer);
  refreshTimer = null;
  elements.loginPanel.hidden = false;
  elements.dashboard.hidden = true;
  elements.logoutButton.hidden = true;
}

function showDashboard() {
  elements.loginPanel.hidden = true;
  elements.dashboard.hidden = false;
  elements.logoutButton.hidden = false;
  elements.loginMessage.textContent = "";

  if (!refreshTimer) {
    refreshTimer = setInterval(loadNowPlaying, 15000);
  }
}

async function loadNowPlaying() {
  try {
    const data = await apiRequest("/api/admin/now-playing");
    renderNowPlaying(data.track);
  } catch (error) {
    if (error.status === 401) showLogin();
  }
}

function renderNowPlaying(track) {
  elements.nowPlaying.replaceChildren();

  if (!track) {
    elements.nowPlaying.append(createMessage("Nothing is playing"));
    return;
  }

  elements.nowPlaying.append(createTrack(track, track.isPlaying ? "Playing" : "Paused"));
}

function renderPlaylist(playlist) {
  elements.playlistHeader.replaceChildren();
  elements.playlistTracks.replaceChildren();

  const summary = document.createElement("div");
  const copy = document.createElement("div");
  const title = document.createElement("h2");
  const count = document.createElement("p");

  summary.className = "playlist-summary";
  copy.className = "track-copy";
  title.textContent = playlist.name;
  count.textContent = `${playlist.total} songs`;
  appendCover(summary, playlist.image, playlist.name);
  copy.append(title, count);
  summary.append(copy);
  elements.playlistHeader.append(summary);

  if (playlist.spotifyUrl) {
    const link = document.createElement("a");
    link.className = "spotify-link";
    link.href = playlist.spotifyUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open in Spotify";
    elements.playlistHeader.append(link);
  }

  if (playlist.tracks.length === 0) {
    elements.playlistTracks.append(createMessage("No songs in this playlist"));
    return;
  }

  for (const track of playlist.tracks) {
    elements.playlistTracks.append(createTrack(track));
  }
}

function createTrack(track, state = "") {
  const row = document.createElement(track.spotifyUrl ? "a" : "div");
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("span");

  row.className = "admin-track";
  copy.className = "track-copy";
  title.textContent = track.name;
  detail.textContent = [track.artists, state].filter(Boolean).join(" · ");
  appendCover(row, track.image, track.album || track.name);
  copy.append(title, detail);
  row.append(copy);

  if (track.spotifyUrl) {
    row.href = track.spotifyUrl;
    row.target = "_blank";
    row.rel = "noreferrer";
  }

  return row;
}

function appendCover(parent, image, alt) {
  if (!image) {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";
    parent.append(placeholder);
    return;
  }

  const img = document.createElement("img");
  img.src = image;
  img.alt = `${alt} cover`;
  parent.append(img);
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "empty-message";
  message.textContent = text;
  return message;
}

function renderPanelError(element, message) {
  element.replaceChildren(createMessage(message));
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
