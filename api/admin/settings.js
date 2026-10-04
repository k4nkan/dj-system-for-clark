import { requireAdmin, verifyAdminPassword } from "../_lib/admin-auth.js";
import { apiError, getBody, sendApiError } from "../_lib/http.js";
import {
  getSystemSettings,
  isSettingsStoreConfigured,
  setAdminPassword,
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
        hasCustomPassword: Boolean(settings.passwordHash),
        storeConfigured: isSettingsStoreConfigured(),
      },
    });
  } catch (error) {
    sendApiError(res, error);
  }
}

async function updateSettings(body) {
  if (typeof body.enabled === "boolean") {
    await updateSystemSettings({ enabled: body.enabled });
  }

  if (body.newPassword !== undefined) {
    const newPassword = String(body.newPassword || "");

    if (!(await verifyAdminPassword(body.currentPassword))) {
      throw apiError(401, "Current password is incorrect");
    }

    if (newPassword.length < 4) {
      throw apiError(400, "New password must be at least 4 characters");
    }

    await setAdminPassword(newPassword);
  }
}
