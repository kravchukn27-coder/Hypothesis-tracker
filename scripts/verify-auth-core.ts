import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { hasCurrentSessionVersion } from "../src/lib/auth/session-version";
import { signSessionToken, verifySessionToken } from "../src/lib/auth/token";

const secret = "test-session-secret-that-is-long-enough";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const passwordHash = hashPassword("correct horse battery staple");
  assert(verifyPassword("correct horse battery staple", passwordHash), "Password should verify.");
  assert(!verifyPassword("wrong password", passwordHash), "Wrong password must be rejected.");

  const token = await signSessionToken("user-1", 3, "session-1", secret, 60);
  const payload = await verifySessionToken(token, secret);
  assert(payload?.sub === "user-1", "Signed token should verify.");
  assert(hasCurrentSessionVersion(payload, 3), "Matching session version should be accepted.");
  assert(!hasCurrentSessionVersion(payload, 4), "Changed session version must be rejected.");
  assert((await verifySessionToken(`${token}x`, secret)) === null, "Tampered token must be rejected.");

  const expiredToken = await signSessionToken("user-1", 3, "session-1", secret, -1);
  assert((await verifySessionToken(expiredToken, secret)) === null, "Expired token must be rejected.");

  console.log("Auth core verification passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
