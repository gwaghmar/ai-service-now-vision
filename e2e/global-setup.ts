import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Ensures schema and seed data exist before E2E (idempotent seed).
 * Requires DATABASE_URL (e.g. `docker compose up -d` then `.env`).
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL?.trim()) return;

  const root = path.resolve(__dirname, "..");
  execSync("npx drizzle-kit push --force", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  execSync("npm run db:seed", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}
