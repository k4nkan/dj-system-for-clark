import { requireAdmin } from "../_lib/admin-auth.js";
import { apiError, getBody, sendApiError } from "../_lib/http.js";
import {
  getRequestPassword,
  getSystemSettings,
  isSettingsStoreConfigured,
  updateSystemSettings,
} from "../_lib/settings.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    requireAdmin(req);

    if (req.method === "PATCH") {
      await updateSettings(getBody(req));
    }

    const settings = await getSystemSettings();
    res.status(200).json({
      settings: {
        enabled: settings.enabled,
        requestPassword: getRequestPassword(settings),
        storeConfigured: isSettingsStoreConfigured(),
      },
    });
  } catch (error) {
    sendApiError(res, error);
  }
}

async function updateSettings(body) {
  const updates = {};

  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled;
  }

  if (body.newRequestPassword !== undefined) {
    const requestPassword = String(body.newRequestPassword || "").trim();

    if (requestPassword.length < 4) {
      throw apiError(400, "New password must be at least 4 characters");
    }

    updates.requestPassword = requestPassword;
  }

  if (Object.keys(updates).length > 0) {
    await updateSystemSettings(updates);
  }
}
