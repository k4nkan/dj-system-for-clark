const elements = {
  searchForm: document.querySelector("#searchForm"),
  requestForm: document.querySelector("#requestForm"),
  searchInput: document.querySelector("#searchInput"),
  mentorPasswordInput: document.querySelector("#mentorPasswordInput"),
  status: document.querySelector("#status"),
  results: document.querySelector("#results"),
  mentorDialog: document.querySelector("#mentorDialog"),
  selectedTrackText: document.querySelector("#selectedTrackText"),
  cancelRequestButton: document.querySelector("#cancelRequestButton"),
};

let selectedTrack = null;

elements.searchForm.addEventListener("submit", onSearchSubmit);
elements.requestForm.addEventListener("submit", onRequestSubmit);
elements.cancelRequestButton.addEventListener("click", closeRequestDialog);

async function onSearchSubmit(event) {
  event.preventDefault();

  const query = elements.searchInput.value.trim();

  if (!query) {
    return;
  }

  setSearchLoading(true);
  setStatus("検索中...");
  elements.results.innerHTML = "";

  try {
    const data = await apiGet(`/api/search?q=${encodeURIComponent(query)}`);
    renderTracks(data.tracks || []);
  } catch (error) {
    setStatus(error.message);
  } finally {
    setSearchLoading(false);
  }
}

async function onRequestSubmit(event) {
  event.preventDefault();

  if (!selectedTrack) {
    return;
  }

  setRequestLoading(true);

  try {
    await apiPost("/api/requests", {
      mentorPassword: elements.mentorPasswordInput.value,
      trackUri: selectedTrack.uri,
    });

    setStatus(`Spotifyプレイリストに追加しました: ${selectedTrack.name}`);
    closeRequestDialog();
  } catch (error) {
    setStatus(error.message);
  } finally {
    setRequestLoading(false);
  }
}

async function apiGet(path) {
  return apiRequest(path);
}

async function apiPost(path, body) {
  return apiRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function apiRequest(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "リクエストに失敗しました");
  }

  return data;
}

function renderTracks(tracks) {
  elements.results.innerHTML = "";

  if (tracks.length === 0) {
    setStatus("該当する曲がありません");
    return;
  }

  setStatus(`${tracks.length}件`);

  for (const track of tracks) {
    elements.results.append(createTrackCard(track));
  }
}

function createTrackCard(track) {
  const article = document.createElement("article");
  article.className = "track";
  article.append(
    createCover(track),
    createTrackInfo(track),
    createTrackActions(track),
  );
  return article;
}

function createCover(track) {
  if (!track.image) {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";
    return placeholder;
  }

  const img = document.createElement("img");
  img.src = track.image;
  img.alt = `${track.album} cover`;
  img.loading = "lazy";
  return img;
}

function createTrackInfo(track) {
  const info = document.createElement("div");
  const title = document.createElement("h3");
  const artists = document.createElement("p");
  const album = document.createElement("p");
  const duration = document.createElement("p");

  title.textContent = track.name;
  artists.textContent = track.artists;
  album.textContent = track.album;
  duration.textContent = `${formatDuration(track.durationMs)}${
    track.explicit ? " / Explicit" : ""
  }`;

  info.append(title, artists, album, duration);
  return info;
}

function createTrackActions(track) {
  const actions = document.createElement("div");
  const button = document.createElement("button");

  actions.className = "track-actions";
  button.type = "button";
  button.textContent = "リクエストする";
  button.addEventListener("click", () => openRequestDialog(track));

  actions.append(button);
  return actions;
}

function openRequestDialog(track) {
  selectedTrack = track;
  elements.selectedTrackText.textContent = `${track.name} / ${track.artists}`;
  elements.mentorPasswordInput.value = "";

  if (typeof elements.mentorDialog.showModal === "function") {
    elements.mentorDialog.showModal();
  } else {
    elements.mentorDialog.setAttribute("open", "");
  }

  elements.mentorPasswordInput.focus();
}

function closeRequestDialog() {
  selectedTrack = null;
  elements.mentorPasswordInput.value = "";

  if (typeof elements.mentorDialog.close === "function") {
    elements.mentorDialog.close();
  } else {
    elements.mentorDialog.removeAttribute("open");
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setSearchLoading(isLoading) {
  elements.searchInput.disabled = isLoading;
  elements.searchForm.querySelector("button").disabled = isLoading;
}

function setRequestLoading(isLoading) {
  elements.requestForm.querySelector('button[type="submit"]').disabled =
    isLoading;
}
