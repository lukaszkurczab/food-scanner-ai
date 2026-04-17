const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureRnfbNonModularHeadersPatch(podfile) {
  const marker = "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES";

  if (podfile.includes(marker)) {
    return podfile;
  }

  const insertion = `
  installer.pods_project.targets.each do |target|
    if ['RNFBApp', 'RNFBAuth', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBMessaging', 'RNFBFirestore', 'RNFBFunctions', 'RNFBStorage', 'RNFBDatabase', 'RNFBRemoteConfig', 'RNFBPerf', 'RNFBInstallations'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
  end`;

  const reactNativePostInstallRegex =
    /react_native_post_install\(\s*installer[\s\S]*?\)\n/m;

  if (reactNativePostInstallRegex.test(podfile)) {
    return podfile.replace(
      reactNativePostInstallRegex,
      (match) => `${match}${insertion}\n`,
    );
  }

  const postInstallBlockRegex =
    /post_install do \|installer\|\n([\s\S]*?)\nend/m;

  if (postInstallBlockRegex.test(podfile)) {
    return podfile.replace(
      postInstallBlockRegex,
      (match, inner) =>
        `post_install do |installer|\n${inner}\n${insertion}\nend`,
    );
  }

  throw new Error(
    "Nie udało się znaleźć bloku post_install w ios/Podfile. Sprawdź wygenerowany Podfile.",
  );
}

module.exports = function withRnfbNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      const original = fs.readFileSync(podfilePath, "utf8");
      const updated = ensureRnfbNonModularHeadersPatch(original);

      if (updated !== original) {
        fs.writeFileSync(podfilePath, updated);
      }

      return config;
    },
  ]);
};
