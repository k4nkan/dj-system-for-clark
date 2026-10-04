import { requireAdmin } from "../_lib/admin-auth.js";
import { allowMethod, sendApiError } from "../_lib/http.js";
import { getNowPlaying } from "../_lib/spotify.js";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "GET")) return;

  try {
    requireAdmin(req);
    res.setHeader("Cache-Control", "private, max-age=5");
    res.status(200).json({ track: await getNowPlaying() });
  } catch (error) {
    sendApiError(res, error);
  }
}
