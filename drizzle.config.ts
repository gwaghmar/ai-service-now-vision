import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

/** Drizzle CLI (migrate/push) uses `pg`; Supabase needs explicit TLS (URI `sslmode` alone is unreliable in Node). */
function dbCredentials() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!raw.includes("supabase.co")) {
    return { url: raw };
  }
  const u = new URL(raw.replace(/^postgresql:/i, "http:"));
  const database = u.pathname.replace(/^\//, "") || "postgres";
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || ""),
    database,
    ssl: { rejectUnauthorized: false },
  };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: dbCredentials(),
});
