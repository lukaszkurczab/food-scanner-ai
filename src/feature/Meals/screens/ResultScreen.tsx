import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import {
  MealBox,
  PrimaryButton,
  Checkbox,
  Layout,
  ConfirmModal,
  CancelModal,
  IngredientBox,
} from "@/src/components";
import { useTheme } from "@/src/theme/useTheme";
import { useMealContext } from "@/src/context/MealContext";
import { useUserContext } from "@/src/context/UserContext";
import { calculateTotalNutrients } from "@/src/services";
import type { MealType } from "@/src/types/meal";

type ResultScreenProps = {
  navigation: any;
};

export default function ResultScreen({ navigation }: ResultScreenProps) {
  const theme = useTheme();
  const { meal, updateMeal, clearMeal, removeIngredient, updateIngredient } =
    useMealContext();
  const { userData } =
    // const { userData, saveMealToFirestoreHistory, saveMealToMyMeals } =
    useUserContext();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saveToMyMeals, setSaveToMyMeals] = useState(false);
  const [mealName, setMealName] = useState(meal?.name || "");
  const [mealType, setMealType] = useState<MealType>(meal?.type || "breakfast");

  if (!meal) return null;

  const nutrition = calculateTotalNutrients([meal]);

  const handleSave = async () => {
    if (!userData?.uid) return;
    const newMeal = {
      ...meal,
      name: mealName,
      type: mealType,
      nutrition,
      date: new Date().toISOString(),
    };
    try {
      //await saveMealToFirestoreHistory(newMeal);
      //if (saveToMyMeals) await saveMealToMyMeals(newMeal);
      //clearMeal();
      //navigation.navigate("Home");
    } catch (error) {
      // obsłuż błąd
    }
  };

  return (
    <Layout showNavigation={false}>
      <MealBox
        name={mealName}
        type={mealType}
        nutrition={nutrition}
        editable
        onNameChange={setMealName}
        onTypeChange={setMealType}
      />

      <Text
        style={{
          marginBottom: theme.spacing.sm,
          fontSize: theme.typography.size.md,
          color: theme.text,
        }}
      >
        Ingredients
      </Text>
      {meal.ingredients.map((ingredient, idx) => (
        <IngredientBox
          key={idx || ingredient.name + idx}
          ingredient={ingredient}
          editable
          onSave={(updated) => updateIngredient(idx, updated)}
          onRemove={() => removeIngredient(idx)}
        />
      ))}

      <View style={{ flexDirection: "row" }}>
        <Checkbox
          checked={saveToMyMeals}
          onChange={setSaveToMyMeals}
          style={{ marginVertical: theme.spacing.md }}
        />
        <Text>Add to My Meals</Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 16,
          marginTop: theme.spacing.lg,
        }}
      >
        <TouchableOpacity onPress={() => setShowCancelModal(true)}>
          <Text
            style={{
              fontSize: theme.typography.size.base,
              color: theme.error.text,
              borderBottomWidth: 1,
              borderColor: theme.error.text,
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        <PrimaryButton label="Save" onPress={() => setShowConfirmModal(true)} />
      </View>

      <CancelModal
        visible={showCancelModal}
        message="Are you sure you want to cancel? All data will be lost."
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false);
          clearMeal();
          navigation.navigate("Home");
        }}
      />
      <ConfirmModal
        visible={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleSave}
      />
    </Layout>
  );
}
