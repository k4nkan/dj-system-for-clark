import { requireAdmin } from "../_lib/admin-auth.js";
import { allowMethod, sendApiError } from "../_lib/http.js";
import { getPlaylist } from "../_lib/spotify.js";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "GET")) return;

  try {
    requireAdmin(req);
    res.status(200).json({ playlist: await getPlaylist() });
  } catch (error) {
    sendApiError(res, error);
  }
}
