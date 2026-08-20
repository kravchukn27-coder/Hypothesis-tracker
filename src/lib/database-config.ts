import type { PoolConfig } from "pg";

export const DATABASE_TIMEOUT_MS = 5_000;

export function createPgPoolConfig(connectionString = process.env.DATABASE_URL): PoolConfig {
  return {
    connectionString,
    connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
    statement_timeout: DATABASE_TIMEOUT_MS,
  };
}
