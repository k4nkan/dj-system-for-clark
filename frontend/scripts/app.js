const elements = {
  phone: document.querySelector("#phone"),
  searchForm: document.querySelector("#searchForm"),
  requestForm: document.querySelector("#requestForm"),
  searchInput: document.querySelector("#searchInput"),
  mentorPasswordInput: document.querySelector("#mentorPasswordInput"),
  results: document.querySelector("#results"),
  resultsPanel: document.querySelector("#resultsPanel"),
  chooseBarText: document.querySelector("#chooseBarText"),
  passwordPanel: document.querySelector("#passwordPanel"),
  selectedCover: document.querySelector("#selectedCover"),
  selectedTrackText: document.querySelector("#selectedTrackText"),
  selectedArtistText: document.querySelector("#selectedArtistText"),
};

let selectedTrack = null;

initializePanels();

elements.searchForm.addEventListener("submit", onSearchSubmit);
elements.requestForm.addEventListener("submit", onRequestSubmit);
elements.searchInput.addEventListener("pointerdown", unlockSearchInput);
elements.searchInput.addEventListener("touchstart", unlockSearchInput);
elements.phone.addEventListener("pointerdown", onPhonePointerDown);

async function onSearchSubmit(event) {
  event.preventDefault();

  const query = elements.searchInput.value.trim();

  if (!query) {
    return;
  }

  releaseSearchInput();
  selectedTrack = null;
  setView("results");
  setSearchLoading(true);
  setChooseBarText("Searching...");
  elements.results.innerHTML = "";

  try {
    const data = await apiGet(`/api/search?q=${encodeURIComponent(query)}`);
    renderTracks(data.tracks || []);
  } catch (error) {
    renderEmptyState(error.message);
    setChooseBarText(error.message);
  } finally {
    setSearchLoading(false);
    releaseSearchInput();
  }
}

async function onRequestSubmit(event) {
  event.preventDefault();

  if (!selectedTrack) {
    setChooseBarText("Select a song first");
    setView("results");
    return;
  }

  setRequestLoading(true);

  try {
    await apiPost("/api/requests", {
      mentorPassword: elements.mentorPasswordInput.value,
      trackUri: selectedTrack.uri,
    });

    setChooseBarText("Added a Song!");
    elements.mentorPasswordInput.value = "";
    selectedTrack = null;
    setView("results");
  } catch (error) {
    setChooseBarText(error.message);
    setView("results");
  } finally {
    setRequestLoading(false);
  }
}

function onPhonePointerDown(event) {
  if (elements.phone.dataset.view !== "password") {
    return;
  }

  if (event.target.closest("#passwordPanel")) {
    return;
  }

  event.preventDefault();
  setView("results");
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
    setChooseBarText("No songs found");
    return;
  }

  setChooseBarText("Choose a Song !!");

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
  renderSelectedTrack(track);
  setView("password");
  elements.mentorPasswordInput.value = "";
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
  setPanelAccessibility(view);

  window.dispatchEvent(new CustomEvent("dj:viewchange", { detail: { view } }));
}

function initializePanels() {
  elements.resultsPanel.hidden = false;
  elements.passwordPanel.hidden = false;
  setPanelAccessibility(elements.phone.dataset.view || "intro");
}

function setPanelAccessibility(view) {
  elements.resultsPanel.setAttribute(
    "aria-hidden",
    view === "intro" ? "true" : "false",
  );
  elements.passwordPanel.setAttribute(
    "aria-hidden",
    view === "password" ? "false" : "true",
  );
}

function setChooseBarText(message) {
  elements.chooseBarText.textContent = message;
}

function releaseSearchInput() {
  elements.searchInput.readOnly = true;
  clearSearchInputFocus();

  requestAnimationFrame(() => {
    clearSearchInputFocus();
  });

  setTimeout(clearSearchInputFocus, 80);
  setTimeout(clearSearchInputFocus, 240);
}

function unlockSearchInput() {
  elements.searchInput.readOnly = false;
}

function clearSearchInputFocus() {
  elements.searchInput.blur();
  window.getSelection()?.removeAllRanges();
}

function setSearchLoading(isLoading) {
  elements.searchForm.querySelector("button").disabled = isLoading;
}

function setRequestLoading(isLoading) {
  elements.mentorPasswordInput.disabled = isLoading;
  elements.requestForm.querySelector("button").disabled = isLoading;
}
