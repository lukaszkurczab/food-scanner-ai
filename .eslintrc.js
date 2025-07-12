module.exports = {
  root: true,
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
          ["@components", "./components"],
          ["@contexts", "./context"],
          ["@feature", "./feature"],
          ["@hooks", "./hooks"],
          ["@navigation", "./navigation"],
          ["@services", "./services"],
          ["@theme", "./theme"],
          ["@types", "./types"],
          ["@utils", "./utils"],
        ],
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
    },
  },
  rules: {
    "import/no-unresolved": "error",
  },
};
