import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/useTheme";
import { Layout, Modal, PrimaryButton, SecondaryButton } from "@/components";
import { IngredientBox } from "@/components/IngredientBox";
import { MaterialIcons } from "@expo/vector-icons";
import { useMealContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export default function ReviewIngredientsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const {
    meal,
    removeIngredient,
    setLastScreen,
    updateIngredient,
    clearMeal,
    saveDraft,
  } = useMealContext();
  const { uid } = useAuthContext();
  const [showModal, setShowModal] = useState(false);

  const ingredients = meal?.ingredients ?? [];
  const image = meal?.photoUrl ?? null;

  useEffect(() => {
    if (uid) setLastScreen(uid, "ReviewIngredients");
  }, [setLastScreen, uid]);

  const handleAddPhoto = () => {
    navigation.replace("MealCamera", { skipDetection: true });
  };

  const handleAddIngredient = () => {
    navigation.navigate("AddMealManual");
  };

  const handleRemoveIngredient = (idx: number) => {
    removeIngredient(idx);
    if (uid) saveDraft(uid);
  };

  const handleSaveIngredient = (idx: number, updated: any) => {
    updateIngredient(idx, updated);
    if (uid) saveDraft(uid);
  };

  const handleContinue = () => {
    navigation.navigate("Result");
  };

  const handleStartOver = () => {
    if (uid) clearMeal(uid);
    navigation.replace("MealAddMethod");
  };

  useEffect(() => {
    if (uid) saveDraft(uid);
  }, [ingredients, image, saveDraft, uid]);

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
                {t("add_photo", { ns: "meals" })}
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
          label={t("add_ingredient", { ns: "meals" })}
          onPress={handleAddIngredient}
          style={styles.addIngredientBtn}
        />
        <PrimaryButton
          label={t("continue", { ns: "common" })}
          onPress={handleContinue}
          disabled={ingredients.length === 0}
          style={styles.continueBtn}
        />
        <SecondaryButton
          label={t("start_over", { ns: "meals" })}
          onPress={() => setShowModal(true)}
          style={styles.startOverBtn}
        />
        <Modal
          visible={showModal}
          title={t("start_over_title", { ns: "meals" })}
          message={t("start_over_message", { ns: "meals" })}
          primaryActionLabel={t("quit", { ns: "common" })}
          onPrimaryAction={handleStartOver}
          secondaryActionLabel={t("continue", { ns: "common" })}
          onSecondaryAction={() => setShowModal(false)}
          onClose={() => setShowModal(false)}
        />
      </View>
    </Layout>
  );
}

const IMAGE_SIZE = 220;

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
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
