import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../types/routes";
import { PieChart } from "react-native-chart-kit";

type MealDetailRouteProp = RouteProp<RootStackParamList, "MealDetail">;
const screenWidth = Dimensions.get("window").width;

export default function MealDetailScreen({
  route,
}: {
  route: MealDetailRouteProp;
}) {
  const { meal } = route.params;

  const getMacroChartData = () => [
    {
      name: "Białko",
      value: meal.nutrition.protein,
      color: "#4CAF50",
      legendFontColor: "#333",
      legendFontSize: 14,
    },
    {
      name: "Tłuszcz",
      value: meal.nutrition.fat,
      color: "#FFC107",
      legendFontColor: "#333",
      legendFontSize: 14,
    },
    {
      name: "Węglowodany",
      value: meal.nutrition.carbs,
      color: "#2196F3",
      legendFontColor: "#333",
      legendFontSize: 14,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        📅 {new Date(meal.date).toLocaleString()}
      </Text>
      <Image source={{ uri: meal.image }} style={styles.image} />

      <Text style={styles.subheader}>Składniki:</Text>
      <FlatList
        data={meal.ingredients}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <Text style={styles.ingredient}>
            • {item.name}: {item.amount}g
          </Text>
        )}
      />

      <Text style={styles.subheader}>Makroskładniki:</Text>
      <Text>Kcal: {meal.nutrition.kcal.toFixed(0)} kcal</Text>
      <Text>Białko: {meal.nutrition.protein.toFixed(1)} g</Text>
      <Text>Tłuszcz: {meal.nutrition.fat.toFixed(1)} g</Text>
      <Text>Węglowodany: {meal.nutrition.carbs.toFixed(1)} g</Text>

      <PieChart
        data={getMacroChartData()}
        width={screenWidth - 40}
        height={180}
        chartConfig={{
          color: () => `#888`,
          backgroundColor: "#fff",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 1,
        }}
        accessor={"value"}
        backgroundColor={"transparent"}
        paddingLeft={"10"}
        absolute
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
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
