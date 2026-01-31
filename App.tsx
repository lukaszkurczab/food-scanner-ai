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
import { InactivityProvider } from "@/context/InactivityContext";
import { HistoryProvider } from "@/context/HistoryContext";
import { View, ActivityIndicator } from "react-native";
import { useAppFonts } from "@hooks/useAppFonts";

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
      <InactivityProvider>
        <PremiumProvider>
          <UserProvider>
            <MealDraftProvider>
              <HistoryProvider>
                <ThemeController>
                  <AppNavigator />
                </ThemeController>
              </HistoryProvider>
            </MealDraftProvider>
          </UserProvider>
        </PremiumProvider>
      </InactivityProvider>
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
