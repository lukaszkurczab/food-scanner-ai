import "dotenv/config";

const iosGoogleServicesFile =
  process.env.GOOGLE_SERVICES_FILE_IOS || "./GoogleService-Info.plist";
const androidGoogleServicesFile =
  process.env.GOOGLE_SERVICES_FILE_ANDROID || "./google-services.json";
const configuredApiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL || ""
).trim();
const isLocalDevelopmentRuntime = process.env.EAS_BUILD !== "true";
const resolvedApiBaseUrl =
  configuredApiBaseUrl ||
  (isLocalDevelopmentRuntime ? "http://localhost:8000/" : "");

export default {
  expo: {
    name: "Fitaly",
    scheme: "fitaly",
    slug: "fitaly",
    owner: "lkurczab",
    version: "1.0.1",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    icon: "./assets/icon.png",
    ios: {
      supportsTablet: false,
      //can't be changed due to app store rules, see https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CoreFoundationKeys.html
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
        backgroundColor: "#FFFDF8",
      },
      package: "com.lkurczab.fitaly",
      googleServicesFile: androidGoogleServicesFile,
    },
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#4F684B",
      androidCollapsedTitle: "Fitaly",
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/splash.png",
          imageWidth: 180,
          backgroundColor: "#F7F2EA",
        },
      ],
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
      debugOcr: (process.env.DEBUG_OCR || "false").toLowerCase() === "true",
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
      buildProfile: process.env.EAS_BUILD_PROFILE || "",
      eas: {
        projectId: "74cb0678-596b-4dc2-bec0-cb1e3a206caa",
      },
    },
  },
};
