import { useEffect, useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  saveMealToHistory,
  detectIngredientsWithVision,
  mockedDetectIngredientsWithVision,
  calculateTotalNutrients,
} from "../services";
import { RootStackParamList } from "../navigation/navigate";
import { Ingredient, Nutrients } from "../types";
import {
  NutrionChart,
  ErrorModal,
  Button,
  ConfirmModal,
  TextInput,
  CancelModal,
} from "../components";
import { useTheme } from "../theme/useTheme";

type ResultRouteProp = RouteProp<RootStackParamList, "Result">;

const ResultScreen = () => {
  const route = useRoute<ResultRouteProp>();
  const { previousIngredients, previousNutrition } = route.params;
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutritionData, setNutritionData] = useState<Nutrients | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      //const newIngredients = await detectIngredientsWithVision(image);
      const newIngredients = await mockedDetectIngredientsWithVision(2, 200);

      if (!newIngredients || newIngredients.length === 0) {
        setShowErrorModal(true);
        return;
      }

      setIngredients([...previousIngredients, ...newIngredients]);
    };

    if (!ingredients.length) analyze();
  }, []);

  useEffect(() => {
    const fetchNutrition = async () => {
      const total: Nutrients = await calculateTotalNutrients(ingredients);
      setNutritionData({
        kcal: total.kcal + (previousNutrition.kcal ?? 0),
        protein: total.protein + (previousNutrition.protein ?? 0),
        fat: total.fat + (previousNutrition.fat ?? 0),
        carbs: total.carbs + (previousNutrition.carbs ?? 0),
      });
    };
    fetchNutrition();
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
    });
  };

  const handleSave = async (mealName: string) => {
    if (!nutritionData) return;
    const meal = {
      id: uuidv4(),
      name: mealName,
      date: new Date().toISOString(),
      ingredients,
      nutrition: nutritionData,
    };
    await saveMealToHistory(meal);
    navigation.navigate("Home");
  };

  const handleNameChange = (index: number, text: string) => {
    const updated = [...ingredients];
    updated[index].name = text;
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.subheader}>Detected Ingredients</Text>
        {!ingredients.length ? (
          <Text style={{ color: theme.text }}>Detecting ingredients...</Text>
        ) : (
          <>
            {ingredients.map((item, index) => (
              <View key={item.name + index} style={styles.ingredientRow}>
                <View
                  style={{
                    width: "100%",
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <TouchableOpacity
                    style={{ width: "5%", overflow: "hidden" }}
                    onPress={() => handleRemoveIngredient(index)}
                  >
                    <Image
                      source={require("../assets/icons/close.png")}
                      style={{ width: 16, height: 16 }}
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={item.name}
                    onEndEditing={(text) => handleNameChange(index, text)}
                  />
                  <View
                    style={{
                      width: "20%",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <TextInput
                      keyboardType="numeric"
                      value={item.amount.toString()}
                      onEndEditing={(text) => handleAmountChange(index, text)}
                      styles={{ width: 50 }}
                    />
                    <Text style={styles.unit}>
                      {item.type === "food" ? "g" : "ml"}
                    </Text>
                  </View>
                </View>
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
      </View>
      {nutritionData && (
        <View style={styles.section}>
          {nutritionData.protein === 0 &&
          nutritionData.carbs === 0 &&
          nutritionData.fat === 0 ? (
            <Text style={styles.subheader}>Meal has no nutritional value.</Text>
          ) : (
            <NutrionChart nutrition={nutritionData} />
          )}
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          gap: 16,
          alignItems: "center",
          justifyContent: "space-between",
          width: "80%",
        }}
      >
        <TouchableOpacity
          style={{
            paddingHorizontal: 30,
          }}
          onPress={() => setShowCancelModal(true)}
        >
          <Text
            style={{
              fontSize: 16,
              borderBottomWidth: 1,
              borderColor: theme.text,
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        <Button
          text="Save"
          onPress={() => setShowConfirmModal(true)}
          style={styles.saveButton}
        />
      </View>
      <CancelModal
        visible={showCancelModal}
        message="Are you sure you want to cancel? All data will be lost."
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false);
          navigation.navigate("Home");
        }}
      />
      <ConfirmModal
        visible={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={(mealName: string) => handleSave(mealName)}
      />
      <ErrorModal
        visible={showErrorModal}
        message="No ingredients detected. Please try taking the photo again."
        onClose={() => {
          setShowErrorModal(false);
          navigation.navigate("Camera", {
            previousIngredients: ingredients,
            previousNutrition: nutritionData,
          });
        }}
      />
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      paddingBottom: 30,
      gap: 24,
      backgroundColor: theme.background,
      minHeight: "100%",
      justifyContent: "space-between",
    },
    header: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
    },
    subheader: {
      fontSize: 18,
      fontWeight: "600",
    },
    ingredientRow: {
      width: "90%",
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      paddingHorizontal: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 6,
      paddingHorizontal: 8,
      width: 80,
      marginLeft: 10,
    },
    section: {
      width: "100%",
      alignItems: "center",
    },
    unit: {
      marginLeft: 5,
    },
    saveButton: {
      width: 150,
    },
    moreIngredientsButton: {
      width: 200,
      marginTop: 16,
      backgroundColor: theme.primaryLight,
    },
    moreIngredientsButtonText: {
      fontSize: 14,
    },
    nameInput: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 6,
      paddingHorizontal: 8,
      width: "70%",
    },
  });

export default ResultScreen;
