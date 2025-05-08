import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../../types/routes";
import NutrionChart from "@/components/NutrionChart";

type MealDetailRouteProp = RouteProp<RootStackParamList, "MealDetail">;

export default function MealDetailScreen() {
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
        Meal name
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 400,
          marginBottom: 10,
        }}
      >
        {new Date(meal.date).toLocaleString()}
      </Text>
      <Text style={styles.subheader}>Ingredients:</Text>
      <FlatList
        data={meal.ingredients}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <Text style={styles.ingredient}>
            • {item.name}: {item.amount}g
          </Text>
        )}
        style={{ flexGrow: 0 }}
      />
      <View style={{ marginBottom: 32 }}>
        <Text style={styles.subheader}>Macronutrients:</Text>
        <Text>Calories: {meal.nutrition.kcal.toFixed(0)} kcal</Text>
        <Text>Protein: {meal.nutrition.protein.toFixed(1)} g</Text>
        <Text>Fat: {meal.nutrition.fat.toFixed(1)} g</Text>
        <Text>Carbohydrates: {meal.nutrition.carbs.toFixed(1)} g</Text>
      </View>
      <NutrionChart nutrition={meal.nutrition} />
    </View>
  );
}

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
