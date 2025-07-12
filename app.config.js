require("dotenv/config");

export default {
  expo: {
    name: "caloriai",
    slug: "caloriai",
    owner: "lkurczab",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.lkurczab.foodscannerai",
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.lkurczab.foodscannerai",
      googleServicesFile: "./google-services.json",
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
          microphonePermission:
            "Allow $(PRODUCT_NAME) to access your microphone",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
      "expo-font",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
    ],
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY,
      eas: {
        projectId: "6126cb31-0485-4b93-b30c-738b65882366",
      },
    },
  },
};
