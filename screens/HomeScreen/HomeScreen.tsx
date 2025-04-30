import { View, Text } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/theme/useTheme";
import { useNavigation } from "@react-navigation/native";
import Tile from "@/components/Tile";

type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  History: undefined;
  Chat: undefined;
  WeeklySummary: undefined;
};
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        backgroundColor: theme.background,
      }}
    >
      <Tile
        title="Meal analysis"
        onPress={() => navigation.navigate("Camera")}
        style={{ width: 310, marginBottom: 10 }}
      />
      <View style={{ flexDirection: "row", gap: 5 }} >
        <Tile
          title="History"
          onPress={() => navigation.navigate("History")}
        />
        <Tile
          title="Statistics"
          onPress={() => navigation.navigate("WeeklySummary")}
        />
        <Tile
          title="Chat with AI"
          onPress={() => navigation.navigate("Chat")}
        />
      </View>
      <ThemeToggle />
    </View>
  );
}
