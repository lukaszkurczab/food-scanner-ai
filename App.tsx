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
import { View, ActivityIndicator } from "react-native";
import { useAppFonts } from "@hooks/useAppFonts";
import { ToastBridge } from "@/components";

function Root() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
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
