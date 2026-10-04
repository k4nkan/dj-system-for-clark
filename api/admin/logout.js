import { clearAdminCookie } from "../_lib/admin-auth.js";
import { allowMethod } from "../_lib/http.js";

export default function handler(req, res) {
  if (!allowMethod(req, res, "POST")) return;

  clearAdminCookie(res);
  res.status(200).json({ ok: true });
}
