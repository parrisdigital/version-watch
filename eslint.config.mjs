import nextVitals from "eslint-config-next/core-web-vitals";
import convexPlugin from "@convex-dev/eslint-plugin";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "convex/_generated/**"],
  },
  ...nextVitals,
  ...convexPlugin.configs.recommended,
];

export default eslintConfig;
