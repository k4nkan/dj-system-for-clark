const elements = {
  phone: document.querySelector("#phone"),
  searchForm: document.querySelector("#searchForm"),
  requestForm: document.querySelector("#requestForm"),
  searchInput: document.querySelector("#searchInput"),
  mentorPasswordInput: document.querySelector("#mentorPasswordInput"),
  status: document.querySelector("#status"),
  results: document.querySelector("#results"),
  resultsPanel: document.querySelector("#resultsPanel"),
  passwordPanel: document.querySelector("#passwordPanel"),
  selectedCover: document.querySelector("#selectedCover"),
  selectedTrackText: document.querySelector("#selectedTrackText"),
  selectedArtistText: document.querySelector("#selectedArtistText"),
};

let selectedTrack = null;

elements.searchForm.addEventListener("submit", onSearchSubmit);
elements.requestForm.addEventListener("submit", onRequestSubmit);

async function onSearchSubmit(event) {
  event.preventDefault();

  const query = elements.searchInput.value.trim();

  if (!query) {
    return;
  }

  selectedTrack = null;
  setView("results");
  setSearchLoading(true);
  setStatus("Searching...");
  elements.results.innerHTML = "";

  try {
    const data = await apiGet(`/api/search?q=${encodeURIComponent(query)}`);
    renderTracks(data.tracks || []);
  } catch (error) {
    renderEmptyState(error.message);
    setStatus(error.message);
  } finally {
    setSearchLoading(false);
  }
}

async function onRequestSubmit(event) {
  event.preventDefault();

  if (!selectedTrack) {
    setStatus("Select a song first");
    setView("results");
    return;
  }

  setRequestLoading(true);
  setStatus("Adding...");

  try {
    await apiPost("/api/requests", {
      mentorPassword: elements.mentorPasswordInput.value,
      trackUri: selectedTrack.uri,
    });

    setStatus(`Added: ${selectedTrack.name}`);
    elements.mentorPasswordInput.value = "";
    selectedTrack = null;
    setView("results");
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
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function renderTracks(tracks) {
  elements.results.innerHTML = "";

  if (tracks.length === 0) {
    renderEmptyState("No songs found");
    setStatus("No songs found");
    return;
  }

  setStatus(`${tracks.length} songs found`);

  for (const track of tracks) {
    elements.results.append(createTrackCard(track));
  }
}

function renderEmptyState(message) {
  elements.results.innerHTML = "";

  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  elements.results.append(empty);
}

function createTrackCard(track) {
  const article = document.createElement("article");
  article.className = "track";
  article.append(
    createCover(track, "track-cover"),
    createTrackInfo(track),
    createAddButton(track),
  );
  return article;
}

function createCover(track, className) {
  const cover = document.createElement("div");
  cover.className = className;

  if (!track.image) {
    cover.classList.add("cover-fallback");
    return cover;
  }

  const img = document.createElement("img");
  img.src = track.image;
  img.alt = track.album ? `${track.album} cover` : `${track.name} cover`;
  img.loading = "lazy";
  cover.append(img);
  return cover;
}

function createTrackInfo(track) {
  const info = document.createElement("div");
  const title = document.createElement("h3");
  const artists = document.createElement("p");

  info.className = "track-info";
  title.textContent = track.name;
  artists.textContent = track.artists;

  info.append(title, artists);
  return info;
}

function createAddButton(track) {
  const button = document.createElement("button");
  button.className = "add-button";
  button.type = "button";
  button.setAttribute("aria-label", `Choose ${track.name}`);
  button.addEventListener("click", () => openPasswordPanel(track));
  return button;
}

function openPasswordPanel(track) {
  selectedTrack = track;
  setStatus("");
  renderSelectedTrack(track);
  setView("password");
  elements.mentorPasswordInput.value = "";
  elements.mentorPasswordInput.focus();
}

function renderSelectedTrack(track) {
  elements.selectedCover.replaceChildren();
  elements.selectedCover.className = "selected-cover";

  if (track.image) {
    const img = document.createElement("img");
    img.src = track.image;
    img.alt = track.album ? `${track.album} cover` : `${track.name} cover`;
    elements.selectedCover.append(img);
  } else {
    elements.selectedCover.classList.add("cover-fallback");
  }

  elements.selectedTrackText.textContent = track.name;
  elements.selectedArtistText.textContent = track.artists;
}

function setView(view) {
  elements.phone.dataset.view = view;
  elements.resultsPanel.hidden = view !== "results";
  elements.passwordPanel.hidden = view !== "password";

  window.dispatchEvent(new CustomEvent("dj:viewchange", { detail: { view } }));
}

function setStatus(message) {
  elements.status.textContent = message;
}

function setSearchLoading(isLoading) {
  elements.searchInput.disabled = isLoading;
  elements.searchForm.querySelector("button").disabled = isLoading;
}

function setRequestLoading(isLoading) {
  elements.mentorPasswordInput.disabled = isLoading;
  elements.requestForm.querySelector("button").disabled = isLoading;
}
