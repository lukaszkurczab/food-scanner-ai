import { useNavigation } from "@react-navigation/native";
import { Text, TouchableOpacity } from "react-native";

export default function Header() {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("Home")}
      style={{
        height: 60,
        justifyContent: "center",
        alignItems: "center",
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
}