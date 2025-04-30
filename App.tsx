import { ThemeProvider } from "./theme/ThemeProvider";
import Layout from "./components/Layout";
import AppNavigator from "./navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./navigation/navigate";

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef}>
        <Layout>
          <AppNavigator />
        </Layout>
      </NavigationContainer>
    </ThemeProvider>
  );
}
