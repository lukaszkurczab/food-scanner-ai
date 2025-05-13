import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/theme/useTheme";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", margin: 10 }}>
      <TouchableOpacity onPress={toggleTheme}>
        <Text
          style={{
            padding: 8,
            backgroundColor: theme.accent,
            borderRadius: 50,
            fontSize: 16,
          }}
        >
          {isDark ? "🌙" : "☀️"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
