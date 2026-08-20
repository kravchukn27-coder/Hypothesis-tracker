import { Pool } from "pg";
import { DATABASE_TIMEOUT_MS, createPgPoolConfig } from "../src/lib/database-config";

const GRACE_MS = 1_500;

async function main() {
  const pool = new Pool(createPgPoolConfig("postgresql://127.0.0.1:1/timeout-check"));
  const startedAt = Date.now();

  try {
    await pool.query("SELECT 1");
    throw new Error("Timeout probe unexpectedly connected");
  } catch (error) {
    if (Date.now() - startedAt > DATABASE_TIMEOUT_MS + GRACE_MS) {
      throw new Error(`Database timeout probe exceeded ${DATABASE_TIMEOUT_MS + GRACE_MS}ms`, { cause: error });
    }
  } finally {
    await pool.end();
  }

  console.log("Database timeout verification passed.");
}

void main();
