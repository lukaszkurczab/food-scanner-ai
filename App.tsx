import "./FirebaseConfig";
import { ThemeProvider } from "./theme/ThemeProvider";
import AppNavigator from "./navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navigation/navigate";
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}
