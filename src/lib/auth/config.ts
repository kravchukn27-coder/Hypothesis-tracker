export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a value of at least 32 characters.");
  }

  return secret;
}
