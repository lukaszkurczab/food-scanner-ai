import { StyleSheet, ScrollView, Text, TouchableOpacity } from "react-native";
import { useUserContext } from "@/src/context/UserContext";
import { useTheme } from "@/src/theme/useTheme";
import { Tile } from "@/src/components";
import { MealHistory } from "@/src/types";
import { useNavigation } from "@react-navigation/native";

const SavedMealsScreen = () => {
  const { userData } = useUserContext();
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  const handleCheckMealDetails = (meal: MealHistory) => {
    navigation.navigate("MealDetail", { meal });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {userData?.myMeals?.map((i) => (
        <Tile key={i.date}>
          <TouchableOpacity
            style={styles.mealContainer}
            onPress={() => handleCheckMealDetails(i)}
          >
            <Text style={styles.name}>{i.name}</Text>
            <Text style={styles.kcal}>{i.nutrition.kcal} kcal</Text>
          </TouchableOpacity>
        </Tile>
      ))}
    </ScrollView>
  );
};

export default SavedMealsScreen;

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
      gap: 8,
    },
    mealContainer: {
      gap: 8,
    },
    name: {
      fontSize: 18,
      fontWeight: "500",
      color: theme.text,
    },
    kcal: {
      fontSize: 16,
    },
  });
