import "dotenv/config";

const iosGoogleServicesFile =
  process.env.GOOGLE_SERVICES_FILE_IOS || "./GoogleService-Info.plist";
const androidGoogleServicesFile =
  process.env.GOOGLE_SERVICES_FILE_ANDROID || "./google-services.json";
const railwayApiBaseUrl =
  "https://food-scanner-ai-backend-production.up.railway.app";
const isEasBuild = process.env.EAS_BUILD === "true";
const localApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000";
const resolvedApiBaseUrl = isEasBuild ? railwayApiBaseUrl : localApiBaseUrl;

export default {
  expo: {
    name: "Fitaly",
    scheme: "fitaly",
    slug: "caloriai",
    owner: "lkurczab",
    version: "1.0.1",
    orientation: "portrait",
    userInterfaceStyle: "light",
    // Keep classic architecture for release stability on TestFlight.
    newArchEnabled: false,
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
      googleServicesFile: iosGoogleServicesFile,
      icon: "./assets/appstore.png",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          "Fitaly uses the camera to scan meals and barcodes and to take profile photos.",
        NSPhotoLibraryUsageDescription:
          "Fitaly allows you to select photos from your library for profile pictures and feedback attachments.",
      },
    },
    android: {
      icon: "./assets/playstore.png",
      adaptiveIcon: {
        foregroundImage: "./assets/playstore.png",
        backgroundColor: "#ffffff",
      },
      package: "com.lkurczab.foodscannerai",
      googleServicesFile: androidGoogleServicesFile,
    },
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#4CAF50",
      androidCollapsedTitle: "fitaly",
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission:
            "Fitaly uses the camera to scan meals and barcodes and to take profile photos.",
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
      apiBaseUrl: resolvedApiBaseUrl,
      apiVersion: process.env.EXPO_PUBLIC_API_VERSION || "v1",
      enableBackendLogging:
        (process.env.EXPO_PUBLIC_ENABLE_BACKEND_LOGGING || "").toLowerCase() ===
        "true",
      debugOcr: (process.env.DEBUG_OCR || "true").toLowerCase() === "true",
      e2e: (process.env.E2E || "").toLowerCase() === "true",
      e2eMockChatReply:
        process.env.E2E_MOCK_CHAT_REPLY ||
        "E2E_MOCK_CHAT_REPLY: Keep hydration and protein consistent every day.",
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
