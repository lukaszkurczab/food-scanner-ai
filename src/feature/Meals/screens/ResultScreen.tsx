import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import {
  MealBox,
  PrimaryButton,
  Checkbox,
  Layout,
  ConfirmModal,
  CancelModal,
  Card,
  IngredientBox,
  SecondaryButton,
  ErrorButton,
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
  const [showIngredients, setShowIngredients] = useState<boolean>(false);
  const image = meal?.photoUrl ?? null;

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
      {image && (
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <MealBox
        name={mealName}
        type={mealType}
        nutrition={nutrition}
        editable
        onNameChange={setMealName}
        onTypeChange={setMealType}
      />
      <Card
        variant="outlined"
        onPress={() => setShowIngredients(!showIngredients)}
      >
        <Text
          style={{
            fontSize: theme.typography.size.md,
            fontWeight: "500",
            color: theme.text,
            textAlign: "center",
          }}
        >
          {showIngredients ? "Hide ingredients" : "Show ingredients"}
        </Text>
      </Card>

      {showIngredients && (
        <>
          {meal.ingredients.map((ingredient, idx) => (
            <IngredientBox
              key={idx || ingredient.name + idx}
              ingredient={ingredient}
              editable={false}
              onSave={(updated) => updateIngredient(idx, updated)}
              onRemove={() => removeIngredient(idx)}
            />
          ))}
          <SecondaryButton
            label="Edit ingredients"
            onPress={() => navigation.navigate("ReviewIngredients")}
          />
        </>
      )}

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Checkbox
          checked={saveToMyMeals}
          onChange={setSaveToMyMeals}
          style={{ marginVertical: theme.spacing.md }}
        />
        <Text>Add to My Meals</Text>
      </View>

      <View
        style={{
          justifyContent: "space-between",
          gap: 16,
          marginTop: theme.spacing.md,
        }}
      >
        <PrimaryButton label="Save" onPress={() => setShowConfirmModal(true)} />
        <ErrorButton label="Cancel" onPress={() => {}} />
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

const IMAGE_SIZE = 220;

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    backgroundColor: "#B2C0C9",
  },
});
