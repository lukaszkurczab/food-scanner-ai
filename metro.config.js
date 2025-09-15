const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  if (!config.resolver.sourceExts.includes("cjs")) {
    config.resolver.sourceExts.push("cjs");
  }
  config.resolver.unstable_enablePackageExports = false;
  return config;
})();
