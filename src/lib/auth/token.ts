import type { SessionPayload } from "./types";

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(value: string): Uint8Array {
  const padding = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", secretBytes);
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSessionToken(
  userId: string,
  sessionVersion: number,
  sessionInstanceId: string,
  secret: string,
  maxAgeSec: number,
): Promise<string> {
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
    sv: sessionVersion,
    sid: sessionInstanceId,
  };
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(payloadB64));

  return `${payloadB64}.${base64urlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token || !secret) return null;

  const [payloadB64, signatureB64, extraPart] = token.split(".");
  if (!payloadB64 || !signatureB64 || extraPart) return null;

  try {
    const signature = Uint8Array.from(base64urlDecode(signatureB64));
    const signatureIsValid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      signature,
      new TextEncoder().encode(payloadB64),
    );
    if (!signatureIsValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as SessionPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.sv !== "number" ||
      !Number.isInteger(payload.sv) ||
      payload.sv < 0 ||
      typeof payload.sid !== "string" ||
      payload.sid.length === 0 ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
