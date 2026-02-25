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
          ["@assets", "./assets"],
          ["@components", "./src/components"],
          ["@contexts", "./src/context"],
          ["@feature", "./src/feature"],
          ["@hooks", "./src/hooks"],
          ["@navigation", "./src/navigation"],
          ["@services", "./src/services"],
          ["@theme", "./src/theme"],
          ["@types", "./src/types"],
          ["@utils", "./src/utils"],
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
