/**
 * FastAPI base URL for fetch calls.
 *
 * Priority:
 * 1. VITE_API_URL — set in `.env` for dev or at build time (any machine).
 * 2. localhost / 127.0.0.1 — use http://127.0.0.1:8000 (Mac local backend).
 * 3. Otherwise — same host as the page, port 8000 (e.g. open UI at
 *    http://raspberrypi:5173 → API http://raspberrypi:8000).
 */
export function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }

  return `${protocol}//${hostname}:8000`;
}
