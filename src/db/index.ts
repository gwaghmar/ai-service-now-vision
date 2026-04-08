import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPool = globalThis as unknown as { pgPool?: pg.Pool };

function createPool() {
  return new pg.Pool({
    connectionString,
    max: Math.min(20, Number(process.env.PGPOOL_MAX ?? 10)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });
}

if (!globalForPool.pgPool) {
  globalForPool.pgPool = createPool();
}

export const pool = globalForPool.pgPool;
export const db = drizzle(pool, { schema });
