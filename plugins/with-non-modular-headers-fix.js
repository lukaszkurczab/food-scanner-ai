const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NON_MODULAR_TARGETS = [
  // React Native Firebase
  "RNFBApp",
  "RNFBAuth",
  "RNFBAnalytics",
  "RNFBCrashlytics",
  "RNFBMessaging",
  "RNFBFirestore",
  "RNFBFunctions",
  "RNFBStorage",
  "RNFBDatabase",
  "RNFBRemoteConfig",
  "RNFBPerf",
  "RNFBInstallations",

  // Expo / task-related pods
  "ExpoTaskManager",
  "EXTaskManager",
  "ExpoBackgroundTask",
  "EXBackgroundTask",
  "ExpoNotifications",
  "EXNotifications",
];

function ensureNonModularHeadersPatch(podfile) {
  const marker = "[with-non-modular-headers-fix]";

  if (podfile.includes(marker)) {
    return podfile;
  }

  const insertion = `
  # ${marker}
  installer.pods_project.targets.each do |target|
    if ${JSON.stringify(NON_MODULAR_TARGETS)}.include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'

        other_cflags = config.build_settings['OTHER_CFLAGS'] || ['$(inherited)']
        other_cflags = [other_cflags] unless other_cflags.is_a?(Array)
        other_cflags << '-Wno-non-modular-include-in-framework-module'
        config.build_settings['OTHER_CFLAGS'] = other_cflags.uniq
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

module.exports = function withNonModularHeadersFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );

      const original = fs.readFileSync(podfilePath, "utf8");
      const updated = ensureNonModularHeadersPatch(original);

      if (updated !== original) {
        fs.writeFileSync(podfilePath, updated);
      }

      return config;
    },
  ]);
};
