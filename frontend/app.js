const searchForm = document.querySelector("#searchForm");
const requestForm = document.querySelector("#requestForm");
const searchInput = document.querySelector("#searchInput");
const mentorPasswordInput = document.querySelector("#mentorPasswordInput");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");
const mentorDialog = document.querySelector("#mentorDialog");
const selectedTrackText = document.querySelector("#selectedTrackText");
const cancelRequestButton = document.querySelector("#cancelRequestButton");

let selectedTrack = null;

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const q = searchInput.value.trim();

  if (!q) {
    return;
  }

  setSearchLoading(true);
  statusEl.textContent = "検索中...";
  resultsEl.innerHTML = "";

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "検索に失敗しました");
    }

    renderTracks(data.tracks || []);
  } catch (error) {
    statusEl.textContent = error.message;
  } finally {
    setSearchLoading(false);
  }
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedTrack) {
    return;
  }

  const mentorPassword = mentorPasswordInput.value;

  setRequestLoading(true);

  try {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mentorPassword,
        trackId: selectedTrack.id,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "リクエストに失敗しました");
    }

    statusEl.textContent = `Spotifyプレイリストに追加しました: ${data.track.name}`;
    closeDialog();
  } catch (error) {
    statusEl.textContent = error.message;
  } finally {
    setRequestLoading(false);
  }
});

cancelRequestButton.addEventListener("click", closeDialog);

function renderTracks(tracks) {
  if (tracks.length === 0) {
    statusEl.textContent = "該当する曲がありません";
    return;
  }

  statusEl.textContent = `${tracks.length}件`;
  resultsEl.innerHTML = "";

  for (const track of tracks) {
    const article = document.createElement("article");
    article.className = "track";

    const cover = track.image
      ? createImage(track.image, `${track.album} cover`)
      : createCoverPlaceholder();

    const info = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    const album = document.createElement("p");
    const duration = document.createElement("p");

    title.textContent = track.name;
    meta.textContent = track.artists;
    album.textContent = track.album;
    duration.textContent = `${formatDuration(track.durationMs)}${
      track.explicit ? " / Explicit" : ""
    }`;

    info.append(title, meta, album, duration);

    const actions = document.createElement("div");
    actions.className = "track-actions";

    const requestButton = document.createElement("button");
    requestButton.type = "button";
    requestButton.textContent = "リクエストする";
    requestButton.addEventListener("click", () => openRequestDialog(track));

    actions.append(requestButton);
    article.append(cover, info, actions);

    resultsEl.append(article);
  }
}

function openRequestDialog(track) {
  selectedTrack = track;
  selectedTrackText.textContent = `${track.name} / ${track.artists}`;
  mentorPasswordInput.value = "";

  if (typeof mentorDialog.showModal === "function") {
    mentorDialog.showModal();
  } else {
    mentorDialog.setAttribute("open", "");
  }

  mentorPasswordInput.focus();
}

function closeDialog() {
  selectedTrack = null;
  mentorPasswordInput.value = "";

  if (typeof mentorDialog.close === "function") {
    mentorDialog.close();
  } else {
    mentorDialog.removeAttribute("open");
  }
}

function createImage(src, alt) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  return img;
}

function createCoverPlaceholder() {
  const div = document.createElement("div");
  div.className = "cover-placeholder";
  return div;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setSearchLoading(isLoading) {
  searchInput.disabled = isLoading;
  searchForm.querySelector("button").disabled = isLoading;
}

function setRequestLoading(isLoading) {
  requestForm.querySelector('button[type="submit"]').disabled = isLoading;
}
