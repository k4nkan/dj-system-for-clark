import {
  allowMethod,
  apiError,
  getBody,
  sendApiError,
} from "../_lib/http.js";
import {
  setAdminCookie,
  verifyAdminPassword,
} from "../_lib/admin-auth.js";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "POST")) return;

  try {
    if (!(await verifyAdminPassword(getBody(req).password))) {
      throw apiError(401, "Invalid password");
    }

    setAdminCookie(res);
    res.status(200).json({ ok: true });
  } catch (error) {
    sendApiError(res, error);
  }
}
