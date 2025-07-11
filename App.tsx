import "./FirebaseConfig";
import { useEffect } from "react";
import { ThemeProvider } from "./theme/ThemeProvider";
import AppNavigator from "./navigation/AppNavigator";
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
} from "@react-navigation/native";
import { navigationRef } from "./navigation/navigate";
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import { MealProvider } from "./context/MealContext";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "./theme";

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
  }, []);

  const navigationTheme = {
    ...NavigationDefaultTheme,
    colors: {
      ...NavigationDefaultTheme.colors,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      primary: theme.accent,
      border: theme.border,
      notification: theme.accentSecondary,
    },
  };

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <UserProvider>
        <MealProvider>
          <ThemeProvider>
            <NavigationContainer ref={navigationRef} theme={navigationTheme}>
              <AppNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </MealProvider>
      </UserProvider>
    </AuthProvider>
  );
}
