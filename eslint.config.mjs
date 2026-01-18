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
    // External projects to ignore:
    "excalidraw/**",
    "AppFlowy/**",

    // Generated code:
    "convex/_generated/**",
    "convex/streaming/_generated/**",

    // SwiftLaTeX WASM files (generated, not our code):
    "20-02-2022/**",
    "public/swiftlatex/**",
    "public/tex/**",
    "overleaf/**",
  ]),
]);

export default eslintConfig;
