import "@/i18n";
import "@/FirebaseConfig";
import "react-native-get-random-values";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

import { ThemeController } from "@/theme/ThemeController";
import AppNavigator from "@/navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import {
  getCurrentRouteNameSafe,
  markNavigationReady,
  markNavigationUnavailable,
  navigationRef,
} from "@/navigation/navigate";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { MealDraftProvider } from "@/context/MealDraftContext";
import { PremiumProvider } from "@/context/PremiumContext";
import { HistoryProvider } from "@/context/HistoryContext";
import { AiCreditsProvider } from "@/context/AiCreditsContext";
import { View, ActivityIndicator, StyleSheet, Text, Linking } from "react-native";
import { useEffect, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useAppFonts } from "@hooks/useAppFonts";
import { ToastBridge } from "@/components";
import { isE2EModeEnabled } from "@/services/e2e/config";
import { handleE2EDeepLink } from "@/services/e2e/deepLink";
import {
  initNotificationTelemetry,
  stopNotificationTelemetry,
} from "@/services/notifications/notificationTelemetry";
import {
  initTelemetryClient,
  stopTelemetryClient,
} from "@/services/telemetry/telemetryClient";
import {
  initTelemetryLifecycle,
  stopTelemetryLifecycle,
} from "@/services/telemetry/telemetryLifecycle";
import { createNavigationTelemetryTracker } from "@/services/telemetry/navigationTelemetry";
import {
  initReminderRuntime,
  setReminderRuntimeUid,
  stopReminderRuntime,
} from "@/services/reminders/reminderRuntime";
import { sanitizeSentryEvent } from "@/services/core/loggingPrivacy";
import { captureException } from "@/services/core/errorLogger";
import { warnMissingEnv } from "@/services/core/envValidation";
import { getLaunchReadinessIssue } from "@/services/release/launchReadiness";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initRevenueCat } from "@/feature/Subscription";

const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
const sentryDsn = typeof extra?.sentryDsn === "string" ? extra.sentryDsn : "";
const sentryEnvironment =
  typeof extra?.sentryEnvironment === "string"
    ? extra.sentryEnvironment
    : "development";
const isPhysicalDevice = Device.isDevice === true;
const shouldDisableSentryReplay = !isPhysicalDevice;
const shouldEnableSentryDebug = sentryEnvironment !== "production" && isPhysicalDevice;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    enableNative: true,
    sendDefaultPii: false,
    tracesSampleRate: sentryEnvironment === "production" ? 0.05 : 0.0,
    attachStacktrace: true,
    debug: shouldEnableSentryDebug,
    beforeSend: (event) => sanitizeSentryEvent(event),
    ...(shouldDisableSentryReplay
      ? {
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0,
        }
      : {}),
    integrations: (defaultIntegrations) =>
      defaultIntegrations.filter(
        (integration) =>
          integration.name !== "ExpoUpdatesListener" &&
          (!shouldDisableSentryReplay || integration.name !== "MobileReplay"),
      ),
  });
}

function Root() {
  const fontsLoaded = useAppFonts();
  const navigationTelemetryHandlerRef = useRef<(() => void) | null>(null);
  const launchIssueLoggedRef = useRef(false);
  const { uid } = useAuthContext();
  const launchReadinessIssue = getLaunchReadinessIssue();

  if (!navigationTelemetryHandlerRef.current) {
    navigationTelemetryHandlerRef.current = createNavigationTelemetryTracker({
      getCurrentRouteName: getCurrentRouteNameSafe,
    });
  }

  useEffect(() => {
    warnMissingEnv();
  }, []);

  useEffect(() => {
    if (!launchReadinessIssue || launchIssueLoggedRef.current) {
      return;
    }
    launchIssueLoggedRef.current = true;
    captureException("launch_readiness_blocked", {
      reason: launchReadinessIssue,
    });
  }, [launchReadinessIssue]);

  useEffect(() => {
    if (launchReadinessIssue) {
      return;
    }

    // RevenueCat setup is moved to runtime effect to avoid extra module-evaluation work on cold start.
    initRevenueCat();

    void (async () => {
      await initTelemetryClient();
      initNotificationTelemetry();
      await Promise.all([
        initTelemetryLifecycle(),
        initReminderRuntime(),
      ]);
    })();

    return () => {
      stopReminderRuntime();
      stopNotificationTelemetry();
      stopTelemetryLifecycle();
      stopTelemetryClient();
    };
  }, [launchReadinessIssue]);

  useEffect(() => {
    if (launchReadinessIssue) {
      return;
    }
    void setReminderRuntimeUid(uid);
  }, [launchReadinessIssue, uid]);

  useEffect(() => {
    return () => {
      markNavigationUnavailable();
    };
  }, []);

  useEffect(() => {
    if (launchReadinessIssue) return;
    if (!isE2EModeEnabled()) return;

    const handleUrl = (url: string) => {
      void handleE2EDeepLink(url);
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    }).catch(() => {
      // Initial URL is optional and not required in every launch.
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => {
      sub.remove();
    };
  }, [launchReadinessIssue]);

  if (launchReadinessIssue) {
    return (
      <View style={styles.launchBlockedContainer}>
        <Text style={styles.launchBlockedTitle}>Launch readiness blocked</Text>
        <Text style={styles.launchBlockedMessage}>{launchReadinessIssue}</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        markNavigationReady();
        navigationTelemetryHandlerRef.current?.();
      }}
      onStateChange={navigationTelemetryHandlerRef.current}
    >
      <AiCreditsProvider>
        <PremiumProvider>
          <UserProvider>
            <MealDraftProvider>
              <HistoryProvider>
                <ThemeController>
                  <AppNavigator />
                  <ToastBridge />
                </ThemeController>
              </HistoryProvider>
            </MealDraftProvider>
          </UserProvider>
        </PremiumProvider>
      </AiCreditsProvider>
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  launchBlockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFDF8",
  },
  launchBlockedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F312B",
    marginBottom: 12,
    textAlign: "center",
  },
  launchBlockedMessage: {
    fontSize: 16,
    color: "#575B52",
    textAlign: "center",
  },
});
