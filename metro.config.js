// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  if (!config.resolver.sourceExts.includes("cjs")) {
    config.resolver.sourceExts.push("cjs");
  }
  if (!config.resolver.assetExts.includes("ttf")) {
    config.resolver.assetExts.push("ttf");
  }
  if (!config.resolver.assetExts.includes("otf")) {
    config.resolver.assetExts.push("otf");
  }

  config.resolver.unstable_enablePackageExports = false;
  return config;
})();
