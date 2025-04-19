import { View, Text, Button } from "react-native";
import { StatusBar } from "expo-status-bar";
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
    Home: undefined;
    Camera: undefined;
    History: undefined;
    Chat: undefined;
};
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
        🍽️ Food Scanner AI
      </Text>
      <Button
        title="Zrób zdjęcie posiłku"
        onPress={() => navigation.navigate("Camera")}
      />
      <Button
        title="Historia posiłków"
        onPress={() => navigation.navigate("History")}
      />
      <StatusBar style="auto" />
      <Button
        title="🧠 Porozmawiaj z dietetykiem AI"
        onPress={() => navigation.navigate("Chat")}
      />
    </View>
  );
}
