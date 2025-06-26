import "./firebase";
import { ThemeProvider } from "./theme/ThemeProvider";
import AppNavigator from "./navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navigation/navigate";

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}
