import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees under .claude/ are full nested copies of the repo
    // (each with their own .next build output) — exclude the whole
    // directory rather than relying on .next/** to match nested paths.
    ".claude/**",
  ]),
]);

export default eslintConfig;
