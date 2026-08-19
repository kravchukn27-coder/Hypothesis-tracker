import type { SessionPayload } from "./types";

export function hasCurrentSessionVersion(payload: SessionPayload, sessionVersion: number): boolean {
  return payload.sv === sessionVersion;
}
