import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "@/src/theme/useTheme";
import { PrimaryButton, SecondaryButton } from "@/src/components";
import { IngredientBox } from "@/src/components/IngredientBox";
import { MaterialIcons } from "@expo/vector-icons";
import { useMealContext } from "@/src/context/MealContext";

export default function ReviewIngredientsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const { meal, removeIngredient, clearMeal, setLastScreen, saveDraft } =
    useMealContext();

  useEffect(() => {
    setLastScreen("ReviewIngredients");
  }, [setLastScreen]);

  const ingredients = meal?.ingredients ?? [];
  const image = meal?.photoUrl ?? route.params?.image ?? null;

  const handleAddPhoto = () => {
    navigation.replace("MealCamera", { id: meal?.mealId });
  };

  const handleAddIngredient = () => {
    navigation.navigate("AddMealManual", { id: meal?.mealId });
  };

  const handleEditIngredient = (idx: number) => {
    navigation.navigate("AddMealManual", { id: meal?.mealId, editIndex: idx });
  };

  const handleRemoveIngredient = (idx: number) => {
    removeIngredient(idx);
    saveDraft();
  };

  const handleContinue = () => {
    navigation.navigate("Result", { id: meal?.mealId });
  };

  const handleStartOver = () => {
    clearMeal();
    navigation.replace("MealCamera");
  };

  useEffect(() => {
    saveDraft();
  }, [ingredients, image]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Foto lub placeholder */}
        <View style={styles.imageWrapper}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Pressable
              onPress={handleAddPhoto}
              style={[styles.placeholder, { backgroundColor: theme.card }]}
            >
              <MaterialIcons
                name="add-a-photo"
                size={44}
                color={theme.textSecondary}
              />
              <Text
                style={[styles.placeholderText, { color: theme.textSecondary }]}
              >
                Add photo
              </Text>
            </Pressable>
          )}
        </View>

        {/* Składniki */}
        {ingredients.map((ing, idx) => (
          <IngredientBox
            key={idx}
            ingredient={ing}
            onEdit={() => handleEditIngredient(idx)}
            onRemove={() => handleRemoveIngredient(idx)}
          />
        ))}

        {/* Dodaj składnik */}
        <SecondaryButton
          label="+ Add ingredient"
          onPress={handleAddIngredient}
          style={styles.addIngredientBtn}
        />
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          style={styles.continueBtn}
        />
        <SecondaryButton
          label="Start over"
          onPress={handleStartOver}
          style={styles.startOverBtn}
        />
      </ScrollView>
    </View>
  );
}

const IMAGE_SIZE = 220;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { alignItems: "center", padding: 18, paddingBottom: 36 },
  imageWrapper: {
    marginTop: 12,
    marginBottom: 22,
    width: IMAGE_SIZE,
    height: 140,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: IMAGE_SIZE,
    height: 140,
    borderRadius: 32,
    backgroundColor: "#B2C0C9",
  },
  placeholder: {
    width: IMAGE_SIZE,
    height: 140,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#B2C0C9",
    gap: 4,
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 3,
  },
  addIngredientBtn: { marginTop: 2, marginBottom: 18, width: "100%" },
  continueBtn: { marginTop: 2, marginBottom: 12, width: "100%" },
  startOverBtn: { marginTop: 0, width: "100%" },
});
