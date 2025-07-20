import { View, Text, StyleSheet, FlatList } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "@/src/navigation/navigate";
import { NutritionChart } from "@/src/components/index";
import { format } from "date-fns";

type MealDetailRouteProp = RouteProp<RootStackParamList, "MealDetail">;

const MealDetailScreen = () => {
  const route = useRoute<MealDetailRouteProp>();
  const { meal } = route.params;

  return (
    <View style={styles.container}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {meal.name}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 400,
          marginBottom: 10,
        }}
      >
        {format(new Date(meal.date), "d/M/yyyy").toLocaleString()}
      </Text>
      <Text style={styles.subheader}>Ingredients:</Text>
      <FlatList
        data={meal.ingredients}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item }) => (
          <Text style={styles.ingredient}>• {item}</Text>
        )}
        style={{ flexGrow: 0 }}
      />
      <View style={{ marginBottom: 32 }}>
        <Text style={styles.subheader}>Macronutrients:</Text>
        <Text>Calories: {meal.nutrition.kcal.toFixed(0)}kcal</Text>
        <Text>Protein: {meal.nutrition.protein.toFixed(0)}g</Text>
        <Text>Fat: {meal.nutrition.fat.toFixed(0)}g</Text>
        <Text>Carbohydrates: {meal.nutrition.carbs.toFixed(0)}g</Text>
      </View>
      <View style={{ flexGrow: 1 }}>
        <NutritionChart nutrition={meal.nutrition} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  subheader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginVertical: 10,
  },
  ingredient: {
    fontSize: 15,
    marginTop: 5,
  },
});

export default MealDetailScreen;
