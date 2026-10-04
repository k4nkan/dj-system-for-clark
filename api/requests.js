import {
  allowMethod,
  apiError,
  getBody,
  sendApiError,
} from "./_lib/http.js";
import { verifyAdminPassword } from "./_lib/admin-auth.js";
import { getSystemSettings } from "./_lib/settings.js";
import { addTrackToPlaylist } from "./_lib/spotify.js";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "POST")) return;

  try {
    const body = getBody(req);
    const trackUri = String(body.trackUri || "").trim();

    if (!(await getSystemSettings()).enabled) {
      throw apiError(403, "Requests are closed");
    }

    if (!(await verifyAdminPassword(body.mentorPassword))) {
      throw apiError(401, "Invalid password");
    }

    if (!trackUri.startsWith("spotify:track:")) {
      throw apiError(400, "Select a track");
    }

    await addTrackToPlaylist(trackUri);
    res.status(201).json({ ok: true });
  } catch (error) {
    sendApiError(res, error);
  }
}
