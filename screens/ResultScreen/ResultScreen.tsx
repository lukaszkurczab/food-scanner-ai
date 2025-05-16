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
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  saveMealToHistory,
  detectIngredientsWithVision,
  getNutrientsForIngredient,
} from "@/services";
import { RootStackParamList } from "@/navigation/navigate";
import { Ingredient, Nutrients } from "@/types";
import { NutrionChart, ErrorModal, Button, Carousel } from "@/components";
import { useTheme } from "@/theme/useTheme";

type ResultRouteProp = RouteProp<RootStackParamList, "Result">;

export default function ResultScreen() {
  const route = useRoute<ResultRouteProp>();
  const { image, prevImages, previousIngredients, previousNutrition } =
    route.params;
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutritionData, setNutritionData] = useState<Nutrients | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      const newIngredients = await detectIngredientsWithVision(image);

      if (!newIngredients || newIngredients.length === 0) {
        setShowErrorModal(true);
        return;
      }

      setIngredients([...previousIngredients, ...newIngredients]);
    };

    if (!ingredients.length) analyze();
  }, []);

  useEffect(() => {
    const recalculateNutrition = async () => {
      let total: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

      for (const item of ingredients) {
        let nutrients;
        if (!item.fromTable) {
          nutrients = await getNutrientsForIngredient(item.name);
        } else {
          nutrients = {
            kcal: item.kcal,
            protein: item.protein,
            fat: item.fat,
            carbs: item.carbs,
          };
        }
        if (nutrients) {
          const multiplier = item.amount / 100;
          total.kcal += Number((nutrients.kcal * multiplier).toFixed(0));
          total.protein += Number((nutrients.protein * multiplier).toFixed(0));
          total.fat += Number((nutrients.fat * multiplier).toFixed(0));
          total.carbs += Number((nutrients.carbs * multiplier).toFixed(0));
        }
      }
      setNutritionData({
        kcal: total.kcal + (previousNutrition.kcal ?? 0),
        protein: total.protein + (previousNutrition.protein ?? 0),
        fat: total.fat + (previousNutrition.fat ?? 0),
        carbs: total.carbs + (previousNutrition.carbs ?? 0),
      });
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

  const handleDetectMoreIngredients = () => {
    navigation.navigate("Camera", {
      previousIngredients: ingredients,
      previousNutrition: nutritionData,
      prevImages: [image, ...prevImages],
    });
  };

  const handleSave = async () => {
    if (!nutritionData) return;
    const meal = {
      id: uuidv4(),
      name: "Meal name",
      date: new Date().toISOString(),
      ingredients,
      nutrition: nutritionData,
    };
    await saveMealToHistory(meal);
  };

  const imageComponentsArray = [image, ...prevImages].map((img) => ({
    id: uuidv4(),
    component: <Image key={img} source={{ uri: img }} style={styles.image} />,
  }));

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <View style={{ height: 300 }}>
        <Carousel items={imageComponentsArray} height={200} />
      </View>

      <Text style={styles.subheader}>Detected Ingredients</Text>
      {!ingredients.length ? (
        <Text style={{ color: theme.text }}>Detecting ingredients...</Text>
      ) : (
        <>
          {ingredients.map((item, index) => (
            <View key={item.name + index} style={styles.ingredientRow}>
              <Text>{item.name}</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={item.amount.toString()}
                onChangeText={(text) => handleAmountChange(index, text)}
              />
              <Text style={styles.unit}>
                {item.type === "food" ? "g" : "ml"}
              </Text>
            </View>
          ))}
          <Button
            text="+ Detect more ingredients"
            onPress={handleDetectMoreIngredients}
            style={styles.moreIngredientsButton}
            textStyle={styles.moreIngredientsButtonText}
          />
        </>
      )}

      {nutritionData && (
        <>
          <Text style={styles.subheader}>Meal nutritions</Text>
          {nutritionData.protein === 0 &&
          nutritionData.carbs === 0 &&
          nutritionData.fat === 0 ? (
            <Text style={styles.subheader}>Meal has no nutritional value.</Text>
          ) : (
            <NutrionChart nutrition={nutritionData} />
          )}
          <Button text="Save" onPress={handleSave} style={styles.saveButton} />
        </>
      )}
      <ErrorModal
        visible={showErrorModal}
        message="No ingredients detected. Please try taking the photo again."
        onClose={() => {
          setShowErrorModal(false);
          navigation.navigate("Camera", {
            previousIngredients: ingredients,
            previousNutrition: nutritionData,
            prevImages: [...prevImages],
          });
        }}
      />
    </ScrollView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
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
    },
    ingredientRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 6,
      paddingHorizontal: 8,
      width: 80,
      marginLeft: 10,
    },
    unit: {
      marginLeft: 5,
    },
    saveButton: {
      width: 200,
    },
    moreIngredientsButton: {
      width: 200,
      marginTop: 16,
      backgroundColor: theme.primaryLight,
    },
    moreIngredientsButtonText: {
      fontSize: 14,
    },
  });
