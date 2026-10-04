import { createHmac, timingSafeEqual } from "node:crypto";
import { apiError } from "./http.js";

const cookieName = "dj_admin";
const sessionValue = "authenticated";

export function verifyAdminPassword(password) {
  const expected = process.env.MENTOR_PASSWORD;

  if (!expected) {
    throw apiError(500, "MENTOR_PASSWORD is required");
  }

  const actualBuffer = Buffer.from(String(password || ""));
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function requireAdmin(req) {
  const cookies = Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([name, value]) => name && value),
  );
  const expected = sign(sessionValue);
  const actual = String(cookies[cookieName] || "");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw apiError(401, "Authentication required");
  }
}

export function setAdminCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=${sign(sessionValue)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`,
  );
}

export function clearAdminCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
}

function sign(value) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.MENTOR_PASSWORD;

  if (!secret) {
    throw apiError(500, "ADMIN_SESSION_SECRET or MENTOR_PASSWORD is required");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}
