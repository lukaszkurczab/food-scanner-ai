module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["import"],
  settings: {
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
  },
};
