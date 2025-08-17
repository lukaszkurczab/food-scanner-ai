import "@/i18n";
import "@/FirebaseConfig";
import "react-native-get-random-values";
import { useEffect } from "react";
import { ThemeController } from "@/theme/ThemeController";
import AppNavigator from "@/navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "@/navigation/navigate";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { MealDraftProvider } from "@/context/MealDraftContext";
import { PremiumProvider } from "@/context/PremiumContext";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme";
import Purchases from "react-native-purchases";
import { Platform } from "react-native";
import { InactivityProvider } from "@contexts/InactivityContext";

export function initRevenueCat() {
  Purchases.configure({
    apiKey: Platform.OS === "android" ? "goog_PJCYrmPITZquBcJXTdOfYxzoeUo" : "",
    appUserID: null,
  });
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("./assets/fonts/Inter-Medium.ttf"),
    "Inter-Bold": require("./assets/fonts/Inter-Bold.ttf"),
    "Inter-Light": require("./assets/fonts/Inter-Light.ttf"),
  });

  useEffect(() => {
    if (__DEV__ && typeof ErrorUtils?.getGlobalHandler === "function") {
      const defaultHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error("Global Error:", error);
        defaultHandler?.(error, isFatal);
      });
    }
    initRevenueCat();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <InactivityProvider>
          <PremiumProvider>
            <UserProvider>
              <MealDraftProvider>
                <ThemeController>
                  <AppNavigator />
                </ThemeController>
              </MealDraftProvider>
            </UserProvider>
          </PremiumProvider>
        </InactivityProvider>
      </NavigationContainer>
    </AuthProvider>
  );
}
