import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "import": importPlugin,
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      
      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "react-hooks/preserve-manual-memoization": "off",

      // React JSX content rules
      "react/jsx-no-comment-textnodes": "off",
      "react/no-unescaped-entities": "warn",
      
      // Import ordering
      "import/order": [
        "error",
        {
          "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          "alphabetize": { "order": "asc", "caseInsensitive": true }
        }
      ],
      "import/no-duplicates": "error",
      
      // Accessibility
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
    },
  },
  // Override default ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
