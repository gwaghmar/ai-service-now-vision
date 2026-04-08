import { assertProductionEnv } from "@/lib/env";

/**
 * Runs once per Node server process. Fails fast in production when env is invalid.
 */
export async function register() {
  if (process.env.NODE_ENV === "production") {
    assertProductionEnv();
  }
}
