import { useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  NutritionChart,
  Button,
  ConfirmModal,
  CancelModal,
  Checkbox,
} from "@/src/components/index";
import { useTheme } from "@/src/theme/index";
import { useMealContext } from "@/src/context/MealContext";
import { useUserContext } from "@/src/context/UserContext";
import { calculateTotalNutrients } from "@/src/services";

const ResultScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = getStyles(theme);

  const { meal, clearMeal } = useMealContext();
  const {
    userData,
    refreshUserData,
    saveMealToFirestoreHistory,
    saveMealToMyMeals,
  } = useUserContext();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saveToMyMeals, setSaveToMyMeals] = useState(false);
  const totalNutrients = calculateTotalNutrients(meal);

  const handleDetectMoreIngredients = () => {
    navigation.navigate("MealAddMethod");
  };

  const handleCheckbox = () => {
    setSaveToMyMeals(!saveToMyMeals);
  };

  const handleSave = async (mealName: string) => {
    if (!userData?.uid) return;

    const ingredientsList = meal
      .flatMap((item) => item.ingredients)
      .map((ing) => ing.name);

    const newMeal = {
      id: uuidv4(),
      name: mealName,
      date: new Date().toISOString(),
      ingredients: ingredientsList,
      nutrition: totalNutrients,
    };

    try {
      await saveMealToFirestoreHistory(newMeal);
      if (saveToMyMeals) saveMealToMyMeals(newMeal);
      clearMeal();
      navigation.navigate("Home");
    } catch (error) {
      console.error("Błąd zapisu posiłku:", error);
    }
  };

  const handleCancel = () => {
    setShowCancelModal(false);
    clearMeal();
    navigation.navigate("Home");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.subheader}>Detected Ingredients</Text>
        {meal.map((item) =>
          item.ingredients.map((ingredient) => (
            <View key={ingredient.name}>
              <Text>
                {ingredient.name} - {ingredient.amount}
                {ingredient.type === "food" ? "g" : "ml"}
              </Text>
            </View>
          ))
        )}
        <Button
          text="Add more ingredients"
          onPress={handleDetectMoreIngredients}
        />
        <NutritionChart nutrition={totalNutrients} />
        <Checkbox
          checked={saveToMyMeals}
          onCheckedChange={handleCheckbox}
          label="Add to MyMeals"
        />
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
            style={{ paddingHorizontal: 30 }}
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
      </View>

      <CancelModal
        visible={showCancelModal}
        message="Are you sure you want to cancel? All data will be lost."
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
      />

      <ConfirmModal
        visible={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={(mealName: string) => handleSave(mealName)}
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
  });

export default ResultScreen;
