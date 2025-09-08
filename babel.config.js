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
            "@/": "./src/",
            "@": "./src",
            "@assets": "./assets",
            "@components": "./src/components",
            "@contexts": "./src/context",
            "@feature": "./src/feature",
            "@hooks": "./src/hooks",
            "@navigation": "./src/navigation",
            "@services": "./src/services",
            "@theme": "./src/theme",
            "@types": "./src/types",
            "@utils": "./src/utils",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
