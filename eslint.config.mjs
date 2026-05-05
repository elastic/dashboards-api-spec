import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  {
    ignores: [
      "scripts/scalar-api-reference.js",
      "dist/**",
      "generated/**",
      "node_modules/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["scripts/scalar-init.mjs"],
    languageOptions: {
      globals: globals.browser,
    },
  },
]);
