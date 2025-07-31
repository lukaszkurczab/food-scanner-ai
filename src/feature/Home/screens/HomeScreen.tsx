import { ScrollView, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { BottomTabBar, Button, Layout } from "@/src/components";
import { RootStackParamList } from "../../../navigation/navigate";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <Layout>
      <ScrollView>
        <Button
          text="Add a new meal"
          onPress={() => navigation.navigate("MealAddMethod")}
        />
      </ScrollView>
    </Layout>
  );
};

export default HomeScreen;
