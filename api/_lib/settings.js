import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { apiError } from "./http.js";

const scrypt = promisify(scryptCallback);
const settingsKey = "dj-system:settings";
const defaultSettings = {
  enabled: true,
  passwordHash: "",
  passwordSalt: "",
};

export function isSettingsStoreConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export async function getSystemSettings() {
  if (!isSettingsStoreConfigured()) {
    return { ...defaultSettings };
  }

  const value = await redisCommand(["GET", settingsKey]);

  if (!value) {
    return { ...defaultSettings };
  }

  const settings = typeof value === "string" ? JSON.parse(value) : value;
  return {
    enabled: settings.enabled !== false,
    passwordHash: String(settings.passwordHash || ""),
    passwordSalt: String(settings.passwordSalt || ""),
  };
}

export async function updateSystemSettings(updates) {
  if (!isSettingsStoreConfigured()) {
    throw apiError(409, "Settings store is not configured");
  }

  const current = await getSystemSettings();
  const settings = { ...current, ...updates };

  await redisCommand(["SET", settingsKey, JSON.stringify(settings)]);
  return settings;
}

export async function setAdminPassword(password) {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(password, passwordSalt);

  return updateSystemSettings({ passwordHash, passwordSalt });
}

export async function verifyStoredPassword(password, settings) {
  if (!settings.passwordHash || !settings.passwordSalt) {
    return null;
  }

  const actual = Buffer.from(await hashPassword(password, settings.passwordSalt));
  const expected = Buffer.from(settings.passwordHash);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function hashPassword(password, salt) {
  const result = await scrypt(String(password), salt, 64);
  return result.toString("hex");
}

async function redisCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    console.error("Settings store request failed", data.error || response.status);
    throw apiError(502, "Settings store request failed");
  }

  return data.result;
}
