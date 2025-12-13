import "dotenv/config";

export default {
  expo: {
    name: "CaloriAI",
    slug: "caloriai",
    owner: "lkurczab",
    version: "1.0.1",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.lkurczab.foodscannerai",
      googleServicesFile: "./GoogleService-Info.plist",
      icon: "./assets/appstore.png",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          "CaloriAI uses the camera to scan meals and barcodes and to take profile photos.",
        NSPhotoLibraryUsageDescription:
          "CaloriAI allows you to select photos from your library for profile pictures and feedback attachments.",
      },
    },
    android: {
      icon: "./assets/playstore.png",
      adaptiveIcon: {
        foregroundImage: "./assets/playstore.png",
        backgroundColor: "#ffffff",
      },
      package: "com.lkurczab.foodscannerai",
      googleServicesFile: "./google-services.json",
    },
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#4CAF50",
      androidCollapsedTitle: "caloriai",
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission:
            "Camera access is used to take photos of meals for nutrition analysis.",
          recordAudioAndroid: false,
        },
      ],
      [
        "expo-build-properties",
        { ios: { useFrameworks: "static", deploymentTarget: "15.5" } },
      ],
      "expo-font",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "expo-notifications",
      "expo-task-manager",
      "expo-background-task",
    ],
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY,
      debugOcr: (process.env.DEBUG_OCR || "true").toLowerCase() === "true",
      revenuecatAndroidKey: process.env.RC_ANDROID_API_KEY || "",
      revenuecatIosKey: process.env.RC_IOS_API_KEY || "",
      disableBilling:
        (process.env.DISABLE_BILLING || "").toLowerCase() === "true",
      forcePremium: (process.env.FORCE_PREMIUM || "").toLowerCase() === "true",
      termsUrl: process.env.TERMS_URL || "",
      privacyUrl: process.env.PRIVACY_URL || "",
      eas: { projectId: "6126cb31-0485-4b93-b30c-738b65882366" },
    },
  },
};
