import { get, put } from "@vercel/blob";

import { apiError } from "./http.js";
import { safeEqual } from "./safe-equal.js";

const settingsPath = "settings.json";
export const settingsBlobClient = { get, put };
const defaultSettings = {
  enabled: true,
  requestPassword: "",
};

export function isSettingsStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function getSystemSettings() {
  if (!isSettingsStoreConfigured()) {
    return { ...defaultSettings };
  }

  try {
    const result = await settingsBlobClient.get(settingsPath, {
      access: "private",
      useCache: false,
    });

    if (!result) {
      return { ...defaultSettings };
    }

    const settings = await new Response(result.stream).json();
    return {
      enabled: settings.enabled !== false,
      requestPassword: String(settings.requestPassword || ""),
    };
  } catch (error) {
    console.error("Settings store read failed", error);
    throw apiError(502, "Settings store read failed");
  }
}

export async function updateSystemSettings(updates) {
  if (!isSettingsStoreConfigured()) {
    throw apiError(409, "Settings store is not configured");
  }

  const current = await getSystemSettings();
  const settings = { ...current, ...updates };

  try {
    await settingsBlobClient.put(settingsPath, JSON.stringify(settings), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("Settings store write failed", error);
    throw apiError(502, "Settings store write failed");
  }

  return settings;
}

export async function requireRequestsOpen() {
  const settings = await getSystemSettings();

  if (!settings.enabled) {
    throw apiError(403, "Requests are closed");
  }

  return settings;
}

export function getRequestPassword(settings) {
  return settings.requestPassword || process.env.REQUEST_PASSWORD || "";
}

export function verifyRequestPassword(password, settings) {
  const expected = getRequestPassword(settings);

  if (!expected) {
    throw apiError(500, "REQUEST_PASSWORD is required");
  }

  return safeEqual(password, expected);
}
