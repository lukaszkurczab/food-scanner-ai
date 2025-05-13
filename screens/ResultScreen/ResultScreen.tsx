import { useEffect, useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  View,
  Image,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  saveMealToHistory,
  detectIngredientsWithVision,
  getNutrientsForIngredient,
} from "@/services";
import { RootStackParamList } from "@/navigation/navigate";
import { Ingredient, Nutrients } from "@/types";
import { NutrionChart, ErrorModal, Button } from "@/components";
import { useTheme } from "@/theme/useTheme";

type ResultRouteProp = RouteProp<RootStackParamList, "Result">;

export default function ResultScreen() {
  const route = useRoute<ResultRouteProp>();
  const { image } = route.params;
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutritionData, setNutritionData] = useState<Nutrients | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      const result = await detectIngredientsWithVision(image);

      if (!result || result.length === 0) {
        setShowErrorModal(true);
        return;
      }

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
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <Image source={{ uri: image }} style={styles.image} />

      <Text style={styles.subheader}>Detected Ingredients</Text>

      {ingredients.map((item, index) => (
        <View key={item.name + index} style={styles.ingredientRow}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={item.amount.toString()}
            onChangeText={(text) => handleAmountChange(index, text)}
          />
          <Text style={styles.unit}>{item.type === "food" ? "g" : "ml"}</Text>
        </View>
      ))}

      {nutritionData && (
        <>
          <Text style={styles.chartTitle}>Meal nutritions</Text>
          <NutrionChart nutrition={nutritionData} />
          <Button text="Save" onPress={handleSave} />
        </>
      )}
      <ErrorModal
        visible={showErrorModal}
        message="No ingredients detected. Please try taking the photo again."
        onClose={() => {
          setShowErrorModal(false);
          navigation.navigate("Camera");
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 60,
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
