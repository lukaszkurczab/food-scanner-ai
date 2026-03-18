import "@/i18n";
import "@/FirebaseConfig";
import "react-native-get-random-values";

import { initRevenueCat } from "@/feature/Subscription";

initRevenueCat();

import { ThemeController } from "@/theme/ThemeController";
import AppNavigator from "@/navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "@/navigation/navigate";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { MealDraftProvider } from "@/context/MealDraftContext";
import { PremiumProvider } from "@/context/PremiumContext";
import { HistoryProvider } from "@/context/HistoryContext";
import { AiCreditsProvider } from "@/context/AiCreditsContext";
import { View, ActivityIndicator } from "react-native";
import { Linking } from "react-native";
import { useCallback, useEffect, useRef } from "react";
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
  trackScreenView,
} from "@/services/telemetry/telemetryInstrumentation";
import {
  initTelemetryLifecycle,
  stopTelemetryLifecycle,
} from "@/services/telemetry/telemetryLifecycle";

function Root() {
  const fontsLoaded = useAppFonts();
  const previousRouteNameRef = useRef<string | undefined>(undefined);

  const handleNavigationStateChange = useCallback(() => {
    const currentRouteName = navigationRef.getCurrentRoute()?.name;
    if (!currentRouteName || previousRouteNameRef.current === currentRouteName) {
      return;
    }

    previousRouteNameRef.current = currentRouteName;
    void trackScreenView(currentRouteName);
  }, []);

  useEffect(() => {
    void (async () => {
      await initTelemetryClient();
      initNotificationTelemetry();
      await initTelemetryLifecycle();
    })();

    return () => {
      stopNotificationTelemetry();
      stopTelemetryLifecycle();
      stopTelemetryClient();
    };
  }, []);

  useEffect(() => {
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
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavigationStateChange}
      onStateChange={handleNavigationStateChange}
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

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
