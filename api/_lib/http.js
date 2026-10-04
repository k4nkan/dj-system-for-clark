export function allowMethod(req, res, method) {
  if (req.method === method) {
    return true;
  }

  res.setHeader("Allow", method);
  res.status(405).json({ error: "Method not allowed" });
  return false;
}

export function getBody(req) {
  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  return req.body || {};
}

export function sendApiError(res, error) {
  const status = Number(error?.status) || 500;

  if (status >= 500) {
    console.error(error);
  }

  const message = status >= 500 ? "Server error" : error.message;
  res.status(status).json({ error: message });
}

export function apiError(status, message) {
  return Object.assign(new Error(message), { status });
}
