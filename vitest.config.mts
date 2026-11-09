import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { readLocalEnvFile } from "./tests/support/local-env";

const sharedConfig = {
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
};

export default defineConfig({
  test: {
    projects: [
      {
        ...sharedConfig,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        ...sharedConfig,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // En local : connexions de .env.development.local ; en CI : variables du job.
          env: readLocalEnvFile(),
        },
      },
    ],
  },
});
