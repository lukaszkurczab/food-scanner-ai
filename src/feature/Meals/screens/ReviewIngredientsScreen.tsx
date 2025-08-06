import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/src/theme/useTheme";
import {
  Layout,
  Modal,
  PrimaryButton,
  SecondaryButton,
} from "@/src/components";
import { IngredientBox } from "@/src/components/IngredientBox";
import { MaterialIcons } from "@expo/vector-icons";
import { useMealContext } from "@/src/context/MealContext";
import { useAuthContext } from "@/src/context/AuthContext";

export default function ReviewIngredientsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const {
    meal,
    removeIngredient,
    setLastScreen,
    updateIngredient,
    clearMeal,
    saveDraft,
  } = useMealContext();
  const { user } = useAuthContext();
  const [showModal, setShowModal] = useState(false);

  const ingredients = meal?.ingredients ?? [];
  const image = meal?.photoUrl ?? null;

  useEffect(() => {
    if (user?.uid) setLastScreen(user.uid, "ReviewIngredients");
  }, [setLastScreen, user?.uid]);

  const handleAddPhoto = () => {
    navigation.replace("MealCamera", { skipDetection: true });
  };

  const handleAddIngredient = () => {
    navigation.navigate("AddMealManual");
  };

  const handleRemoveIngredient = (idx: number) => {
    removeIngredient(idx);
    if (user?.uid) saveDraft(user.uid);
  };

  const handleSaveIngredient = (idx: number, updated: any) => {
    updateIngredient(idx, updated);
    if (user?.uid) saveDraft(user.uid);
  };

  const handleContinue = () => {
    navigation.navigate("Result");
  };

  const handleStartOver = () => {
    if (user?.uid) clearMeal(user.uid);
    navigation.replace("MealAddMethod");
  };

  useEffect(() => {
    if (user?.uid) saveDraft(user.uid);
  }, [ingredients, image, saveDraft, user?.uid]);

  return (
    <Layout showNavigation={false}>
      <View style={styles.wrapper}>
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

        {ingredients.map((ing, idx) => (
          <IngredientBox
            key={idx}
            ingredient={ing}
            editable={true}
            onSave={(updated) => handleSaveIngredient(idx, updated)}
            onRemove={() => handleRemoveIngredient(idx)}
          />
        ))}

        <SecondaryButton
          label="+ Add ingredient"
          onPress={handleAddIngredient}
          style={styles.addIngredientBtn}
        />
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          disabled={ingredients.length === 0}
          style={styles.continueBtn}
        />
        <SecondaryButton
          label="Start over"
          onPress={() => setShowModal(true)}
          style={styles.startOverBtn}
        />
        <Modal
          visible={showModal}
          title="Are you sure you want to start over?"
          message="Every data will be lost"
          primaryActionLabel="Quit"
          onPrimaryAction={handleStartOver}
          secondaryActionLabel="Continue"
          onSecondaryAction={() => setShowModal(false)}
          onClose={() => setShowModal(false)}
        />
      </View>
    </Layout>
  );
}

const IMAGE_SIZE = 220;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  imageWrapper: {
    marginBottom: 22,
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    backgroundColor: "#B2C0C9",
  },
  placeholder: {
    width: "100%",
    height: IMAGE_SIZE,
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
