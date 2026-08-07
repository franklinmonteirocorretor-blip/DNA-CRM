import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatos externos compilados (não fazem parte do DNA CRM):
    "tools/fb-scraper/dist/**",
    "coverage/**",
    // Scripts de migração e testes auxiliares (CJS, fora do source tree do app):
    "scripts/**",
    "tests/crud-real.cjs",
    // Área de trabalho temporária (diagnóstico, fora do source tree):
    ".tmp/**",
  ]),
]);

export default eslintConfig;
