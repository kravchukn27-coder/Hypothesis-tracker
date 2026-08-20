// TECH-041: keep `pg` as a direct dependency. This module configures its
// public PoolConfig API, while scripts/verify-db-timeout.ts uses Pool at runtime.
import type { PoolConfig } from "pg";

export const DATABASE_TIMEOUT_MS = 5_000;

export function createPgPoolConfig(connectionString = process.env.DATABASE_URL): PoolConfig {
  return {
    connectionString,
    connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
    statement_timeout: DATABASE_TIMEOUT_MS,
  };
}
