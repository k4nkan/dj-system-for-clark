import { allowMethod, apiError, sendApiError } from "./_lib/http.js";
import { getSystemSettings } from "./_lib/settings.js";
import { searchTracks } from "./_lib/spotify.js";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "GET")) return;

  try {
    if (!(await getSystemSettings()).enabled) {
      throw apiError(403, "Requests are closed");
    }

    const query = String(req.query.q || "").trim();
    if (!query) throw apiError(400, "q is required");

    res.status(200).json({ tracks: await searchTracks(query) });
  } catch (error) {
    sendApiError(res, error);
  }
}
