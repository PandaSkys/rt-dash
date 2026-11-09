import { defineConfig } from "@playwright/test";
import { readTestEnv } from "./tests/support/local-env";

const PORT = 3100;
const APP_URL = `http://localhost:${PORT}`;
const testEnv = readTestEnv();

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: APP_URL },
  // On teste le serveur standalone de production, celui de l'image Docker, branché sur la
  // base locale (pnpm db:up) ou celle de la CI.
  webServer: {
    command: "pnpm build && node scripts/prepare-standalone.mjs && node .next/standalone/server.js",
    env: {
      PORT: String(PORT),
      APP_URL,
      DATABASE_URL: testEnv.DATABASE_URL ?? "",
      // Le départ vers Discord n'a besoin que d'un identifiant ; aucun vrai secret en test.
      DISCORD_CLIENT_ID: testEnv.DISCORD_CLIENT_ID ?? "100000000000000000",
      DISCORD_CLIENT_SECRET: "e2e-sans-secret",
    },
    url: `${APP_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
