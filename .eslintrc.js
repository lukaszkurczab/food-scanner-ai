const path = require("path");

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["import", "react-hooks"],
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      alias: {
        map: [
          ["@", path.resolve(__dirname, "src")],
          ["@assets", path.resolve(__dirname, "assets")],
          ["@components", path.resolve(__dirname, "src/components")],
          ["@contexts", path.resolve(__dirname, "src/context")],
          ["@feature", path.resolve(__dirname, "src/feature")],
          ["@hooks", path.resolve(__dirname, "src/hooks")],
          ["@navigation", path.resolve(__dirname, "src/navigation")],
          ["@services", path.resolve(__dirname, "src/services")],
          ["@theme", path.resolve(__dirname, "src/theme")],
          ["@types", path.resolve(__dirname, "src/types")],
          ["@utils", path.resolve(__dirname, "src/utils")],
        ],
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
      typescript: {},
    },
  },
  rules: {
    "import/no-unresolved": "error",
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "prefer-const": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "no-unused-vars": "off",
      },
    },
  ],
};
