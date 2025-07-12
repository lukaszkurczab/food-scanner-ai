import { useTheme } from "../theme/useTheme";
import { useNavigation } from "@react-navigation/native";
import { Text, TouchableOpacity } from "react-native";

export const Header = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("Home")}
      style={{
        alignItems: "center",
        backgroundColor: theme.background,
        height: 60,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          fontFamily: "Lexend, sans-serif",
        }}
      >
        CaloriAI
      </Text>
    </TouchableOpacity>
  );
};
