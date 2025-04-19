import React, { useEffect, useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  View,
  Image,
  Text,
  StyleSheet,
  TextInput,
  Button,
  ScrollView,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { saveMealToHistory } from "../../utils/history";
import { RootStackParamList } from "../../types/routes";
import {
  mockDetectIngredients,
} from "../../utils/detectIngredients";
import { getNutrientsForIngredient } from "../../utils/getNutrition";
import { Ingredient, Nutrients } from "../../types/common";

const screenWidth = Dimensions.get("window").width;
type ResultScreenRouteProp = RouteProp<RootStackParamList, "Result">;

export default function ResultScreen({
  route,
}: {
  route: ResultScreenRouteProp;
}) {
  const { image } = route.params;
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutritionData, setNutritionData] = useState<Nutrients | null>(null);

  useEffect(() => {
    const analyze = async () => {
      const result = await mockDetectIngredients(image);
      setIngredients(result);
    };
    analyze();
  }, []);

  useEffect(() => {
    const recalculateNutrition = async () => {
      let total: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

      for (const item of ingredients) {
        const data = await getNutrientsForIngredient(item.name);
        if (data) {
          const multiplier = item.amount / 100;
          total.kcal += data.kcal * multiplier;
          total.protein += data.protein * multiplier;
          total.fat += data.fat * multiplier;
          total.carbs += data.carbs * multiplier;
        }
      }
      setNutritionData(total);
    };

    if (ingredients.length > 0) recalculateNutrition();
  }, [ingredients]);

  const getMacroChartData = (data: Nutrients) => [
    {
      name: "Białko",
      value: data.protein,
      color: "#4CAF50",
      legendFontColor: "#333",
      legendFontSize: 14,
    },
    {
      name: "Tłuszcz",
      value: data.fat,
      color: "#FFC107",
      legendFontColor: "#333",
      legendFontSize: 14,
    },
    {
      name: "Węglowodany",
      value: data.carbs,
      color: "#2196F3",
      legendFontColor: "#333",
      legendFontSize: 14,
    },
  ];

  const handleAmountChange = (index: number, text: string) => {
    const updated = [...ingredients];
    const parsed = parseInt(text);
    if (!isNaN(parsed)) {
      updated[index].amount = parsed;
      setIngredients(updated);
    }
  };

  const handleSave = async () => {
    if (!nutritionData) return;
    const meal = {
      id: uuidv4(),
      image,
      date: new Date().toISOString(),
      ingredients,
      nutrition: nutritionData,
    };
    await saveMealToHistory(meal);
    alert("Posiłek zapisany ✅");
    
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>📸 Twoje zdjęcie:</Text>
      <Image source={{ uri: image }} style={styles.image} />

      <Text style={styles.subheader}>🧠 Rozpoznane składniki:</Text>

      {ingredients.map((item, index) => (
        <View key={item.name + index} style={styles.ingredientRow}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={item.amount.toString()}
            onChangeText={(text) => handleAmountChange(index, text)}
          />
          <Text style={styles.unit}>g</Text>
        </View>
      ))}

      {nutritionData && (
        <>
          <Text style={styles.chartTitle}>Makroskładniki (%)</Text>
          <PieChart
            data={getMacroChartData(nutritionData)}
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
          <View style={{ marginTop: 20 }}>
            <Button
              title="Zapisz do historii"
              onPress={handleSave}
              color="#4CAF50"
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: "#f8f8f8",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subheader: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  ingredientName: {
    width: 100,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 8,
    width: 80,
    marginLeft: 10,
  },
  unit: {
    marginLeft: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 30,
  },
});
