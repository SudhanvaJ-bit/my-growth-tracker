// Small wrapper around fetch: adds the login token and turns errors into messages.
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "mgt-token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

function errorMessage(body, status) {
  if (body && typeof body.detail === "string") return body.detail;
  if (body && Array.isArray(body.detail) && body.detail.length) {
    // FastAPI validation errors: [{loc: ["body", "field"], msg: "..."}]
    const first = body.detail[0];
    const field = first.loc?.[first.loc.length - 1];
    const msg = String(first.msg || "Invalid value").replace(/^Value error, /, "");
    return field && field !== "body" ? `${String(field).replace(/_/g, " ")}: ${msg}` : msg;
  }
  return status >= 500 ? "The server had a problem. Please try again." : "Something went wrong.";
}

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // An expired or invalid token on a protected route: sign out.
    if (res.status === 401 && token && !path.startsWith("/api/auth/")) onUnauthorized();
    throw new Error(errorMessage(data, res.status));
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
};
