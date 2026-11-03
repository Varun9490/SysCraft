import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Next 16 removed `next lint`; ESLint runs directly against this flat config.
 * Build output and generated scripts are not source, so they stay out of scope.
 */
export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "shots/**",
      "server/**",
      "scripts/**",
      // One-off Node maintenance scripts at the repo root.
      "*.js",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // "Module" is the curriculum's domain word (see PATH_PARTS); every hit is
      // a local binding, not an assignment to the CommonJS global.
      "@next/next/no-assign-module-variable": "off",
      // React Compiler lint rules shipped in eslint-config-next 16. The app
      // predates the compiler; keep them visible as warnings until the
      // migration, instead of blocking every unrelated change on a refactor.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
];
