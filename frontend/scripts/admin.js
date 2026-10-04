const elements = {
  loginPanel: document.querySelector("#loginPanel"),
  loginForm: document.querySelector("#loginForm"),
  passwordInput: document.querySelector("#passwordInput"),
  loginMessage: document.querySelector("#loginMessage"),
  dashboard: document.querySelector("#dashboard"),
  logoutButton: document.querySelector("#logoutButton"),
  refreshButton: document.querySelector("#refreshButton"),
  nowPlaying: document.querySelector("#nowPlaying"),
  playlistHeader: document.querySelector("#playlistHeader"),
  playlistTracks: document.querySelector("#playlistTracks"),
};

let refreshTimer = null;

elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
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
  const [nowPlaying, playlist] = await Promise.allSettled([
    apiRequest("/api/admin/now-playing"),
    apiRequest("/api/admin/playlist"),
  ]);
  const authError = [nowPlaying, playlist].find(
    (result) => result.status === "rejected" && result.reason.status === 401,
  );

  if (authError) {
    showLogin();
    return;
  }

  showDashboard();

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
