import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nodeScriptGlobals = {
  console: "readonly",
  process: "readonly",
  require: "readonly",
  module: "readonly",
  exports: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  fetch: "readonly",
  Buffer: "readonly",
  setTimeout: "readonly",
  setInterval: "readonly",
  clearTimeout: "readonly",
  clearInterval: "readonly",
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/drizzle/**",
      "**/*.config.*",
      "**/next-env.d.ts",
    ],
  },

  js.configs.recommended,

  // Plain Node scripts (repo root `scripts/`, ad hoc *.cjs test helpers) —
  // no TypeScript here, just needs Node's own globals recognized.
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      globals: nodeScriptGlobals,
    },
  },

  // Baseline TypeScript rules across the whole workspace (api, web, packages/*).
  // Not the type-checked variant: that needs `parserOptions.project` wired to
  // every tsconfig in the monorepo, which is its own follow-up, not this pass.
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },

  // Next.js-specific rules (React, hooks, a11y, core-web-vitals) — scoped to
  // the web app only, via the FlatCompat bridge since eslint-config-next
  // ships as a shareable eslintrc-style config.
  ...compat.extends("next/core-web-vitals", "next/typescript").map((config) => ({
    ...config,
    files: ["apps/web/**/*.{ts,tsx,js,jsx}"],
  })),

  // Final word on every TS/TSX file, applied after the Next.js block above so
  // it can't be re-clobbered by whatever severities next/typescript sets.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      // This codebase uses `any` pervasively (e.g. `catch (err: any)`, loose
      // API payloads) — flagging every instance as an error would drown out
      // everything else on this first lint pass. Revisit once the rest of
      // the ruleset has bedded in.
      "@typescript-eslint/no-explicit-any": "off",
      // TypeScript's own compiler (`pnpm typecheck`) already catches
      // undefined references far more reliably than ESLint can here.
      "no-undef": "off",
      // Base `no-redeclare` doesn't understand TypeScript's separate
      // type/value namespaces (e.g. `const X = {...}; type X = ...;`),
      // producing false positives on that idiom.
      "no-redeclare": "off",
    },
  },

  // Must be last: turns off stylistic rules that would otherwise conflict
  // with Prettier's own formatting decisions.
  eslintConfigPrettier,
];
