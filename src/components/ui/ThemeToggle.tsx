import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/src/theme/index";

export const ThemeToggle = () => {
  const { accent, mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", margin: 10 }}>
      <TouchableOpacity onPress={toggleTheme}>
        <Text
          style={{
            padding: 8,
            backgroundColor: accent,
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
