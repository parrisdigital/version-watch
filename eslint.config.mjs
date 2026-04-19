import nextVitals from "eslint-config-next/core-web-vitals";
import convexPlugin from "@convex-dev/eslint-plugin";

export default [
  ...nextVitals,
  ...convexPlugin.configs.recommended,
  {
    ignores: [".next/**", "node_modules/**"],
  },
];
