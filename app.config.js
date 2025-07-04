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
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.lkurczab.foodscannerai",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.lkurczab.foodscannerai",
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
          android: {
            kotlinVersion: "1.9.10",
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 24,
          },
        },
      ],
    ],
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY,
      usdaApiKey: process.env.USDA_API_KEY,
      eas: {
        projectId: "6126cb31-0485-4b93-b30c-738b65882366",
      },
    },
  },
};
