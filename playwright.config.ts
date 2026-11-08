import { defineConfig } from "@playwright/test";
import { readLocalSupabase } from "./tests/support/local-supabase";

const PORT = 3100;
const APP_URL = `http://localhost:${PORT}`;
const supabase = readLocalSupabase();

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: APP_URL },
  // On teste le serveur standalone de production, celui de l'image Docker, branché sur
  // le Supabase local (`supabase start`).
  webServer: {
    command: "pnpm build && node scripts/prepare-standalone.mjs && node .next/standalone/server.js",
    env: {
      PORT: String(PORT),
      APP_URL,
      SUPABASE_URL: supabase.apiUrl,
      SUPABASE_ANON_KEY: supabase.publishableKey,
    },
    url: `${APP_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
