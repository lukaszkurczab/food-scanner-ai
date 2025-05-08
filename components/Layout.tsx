import { StatusBar, View } from "react-native";
import Header from "./Header";
import Navigation from "./Navigation";
import { JSX } from "react";
import { useTheme } from "@/theme/useTheme";

export default function Layout({children}: { children: JSX.Element }) {
    const { theme } = useTheme();
    return (
      <View style={{ 
        flex: 1,
        backgroundColor: theme.background
      }}>
        <StatusBar />
        <Header />
        {children}
        <Navigation />
      </View>
    );
}