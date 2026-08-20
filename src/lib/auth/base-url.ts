const LOCAL_ORIGIN = "http://localhost:3000";

/**
 * Returns the deployment's canonical public origin for shareable auth links.
 * Request Host headers are deliberately never used here: they can be forged
 * by a client before a proxy has normalized them.
 */
export function getRequestOrigin(): string {
  const configured = process.env.APP_BASE_URL;
  if (!configured) {
    if (process.env.NODE_ENV !== "production") return LOCAL_ORIGIN;
    throw new Error("APP_BASE_URL must be configured in production.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("APP_BASE_URL must be an absolute HTTP(S) URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use HTTP or HTTPS.");
  }
  return url.origin;
}
