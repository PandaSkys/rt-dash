import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const TEST_FILES = ["tests/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"];
const GENERATED_FILES = ["src/core/db/database.types.ts"];
// Dossiers autorisés à importer le client de la base (design § 3.2), plus les tests qui les vérifient.
const DATABASE_CLIENT_ALLOWED_FILES = [
  "src/core/db/**",
  "src/**/queries/**",
  "src/**/actions/**",
  "tests/**",
];

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
          group: ["kysely", "pg", "@/core/db/client"],
          message:
            "Le client de la base ne s'importe que depuis core/db, queries/ ou actions/ (design § 3.2).",
        },
      ],
    },
  ],
};

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Les fichiers générés (types de la base) ne sont pas relus par ESLint.
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts", ...GENERATED_FILES]),
  {
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: { ...readabilityRules, ...securityAndTypingRules },
  },
  {
    files: DATABASE_CLIENT_ALLOWED_FILES,
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: TEST_FILES,
    rules: { "max-lines": "off", "max-lines-per-function": "off" },
  },
]);
