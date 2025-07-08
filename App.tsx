import "./FirebaseConfig";
import { useEffect } from "react";
import { ThemeProvider } from "./theme/ThemeProvider";
import AppNavigator from "./navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navigation/navigate";
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import { MealProvider } from "./context/MealContext";

export default function App() {
  useEffect(() => {
    if (__DEV__ && typeof ErrorUtils?.getGlobalHandler === "function") {
      const defaultHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error("Global Error:", error);
        defaultHandler?.(error, isFatal);
      });
    }
  }, []);

  return (
    <AuthProvider>
      <UserProvider>
        <MealProvider>
          <ThemeProvider>
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </MealProvider>
      </UserProvider>
    </AuthProvider>
  );
}
