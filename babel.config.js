module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          alias: {
            "@assets": "./assets",
            "@components": "./components",
            "@contexts": "./context",
            "@feature": "./feature",
            "@hooks": "./hooks",
            "@navigation": "./navigation",
            "@services": "./services",
            "@theme": "./theme",
            "@types": "./types",
            "@utils": "./utils",
          },
        },
      ],
    ],
  };
};
