import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const TEST_FILES = ["tests/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"];
const GENERATED_FILES = ["src/core/supabase/database.types.ts"];
// Dossiers autorisés à importer le client Supabase (design § 3.2).
const SUPABASE_ALLOWED_FILES = ["src/core/supabase/**", "src/**/queries/**", "src/**/actions/**"];

const readabilityRules = {
  "max-lines": ["error", { max: 300 }],
  "max-lines-per-function": ["error", { max: 60 }],
  complexity: ["error", 10],
  "max-depth": ["error", 3],
  "max-params": ["error", 3],
  "import/no-cycle": "error",
};

const securityAndTypingRules = {
  "react/no-danger": "error",
  "@typescript-eslint/no-explicit-any": "error",
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["@supabase/*", "@/core/supabase/*"],
          message:
            "Le client Supabase ne s'importe que depuis core/supabase, queries/ ou actions/ (design § 3.2).",
        },
      ],
    },
  ],
};

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts"]),
  {
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: { ...readabilityRules, ...securityAndTypingRules },
  },
  {
    files: SUPABASE_ALLOWED_FILES,
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: [...TEST_FILES, ...GENERATED_FILES],
    rules: { "max-lines": "off", "max-lines-per-function": "off" },
  },
]);
