import { StatusBar, View } from "react-native";
import { Header } from "./Header";
import Navigation from "./Navigation";
import { JSX } from "react";
import { useTheme } from "../theme/useTheme";
import { useRoute } from "@react-navigation/native";

const hiddenRoutes = ["Login", "Register", "AuthLoading"];

export const Layout = ({ children }: { children: JSX.Element }) => {
  const theme = useTheme();
  const route = useRoute();

  const isVisible = !hiddenRoutes.includes(route.name);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
    >
      <StatusBar />
      {isVisible && <Header />}
      {children}
      {isVisible && <Navigation />}
    </View>
  );
};
