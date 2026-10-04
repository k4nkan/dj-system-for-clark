import { allowMethod, sendApiError } from "./_lib/http.js";
import { getSystemSettings } from "./_lib/settings.js";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "GET")) return;

  try {
    const settings = await getSystemSettings();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ enabled: settings.enabled });
  } catch (error) {
    sendApiError(res, error);
  }
}
