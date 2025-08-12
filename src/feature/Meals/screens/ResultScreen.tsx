import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import {
  MealBox,
  PrimaryButton,
  Checkbox,
  Layout,
  Card,
  IngredientBox,
  SecondaryButton,
  ErrorButton,
  Modal,
} from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useMealContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import { useMeals } from "@hooks/useMeals";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { useAuthContext } from "@/context/AuthContext";
import type { MealType } from "@/types/meal";
import { autoMealName } from "@/utils/autoMealName";
import { useTranslation } from "react-i18next";

type ResultScreenProps = {
  navigation: any;
};

export default function ResultScreen({ navigation }: ResultScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const { uid } = useAuthContext();
  const { meal, setLastScreen, clearMeal, removeIngredient, updateIngredient } =
    useMealContext();
  const { userData } = useUserContext();
  const { addMeal } = useMeals(uid || "");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saveToMyMeals, setSaveToMyMeals] = useState(false);
  const [mealName, setMealName] = useState(meal?.name || autoMealName());
  const [mealType, setMealType] = useState<MealType>(meal?.type || "breakfast");
  const [showIngredients, setShowIngredients] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const image = meal?.photoUrl ?? null;

  useEffect(() => {
    if (uid) setLastScreen(uid, "Result");
  }, [setLastScreen, uid]);

  if (!meal || !uid) return null;

  const nutrition = calculateTotalNutrients([meal]);

  const handleSave = async () => {
    if (!userData?.uid || saving) return;
    setSaving(true);
    const newMeal = {
      ...meal,
      cloudId: meal.cloudId,
      userUid: uid,
      name: mealName,
      type: mealType,
      nutrition,
      date: new Date().toISOString(),
      syncState: "pending",
      updatedAt: new Date().toISOString(),
    } as any;
    try {
      await addMeal(newMeal);
      clearMeal(uid);
      navigation.navigate("Home");
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (uid) clearMeal(uid);
    navigation.navigate("Home");
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
        editable={!saving}
        onNameChange={setMealName}
        onTypeChange={setMealType}
      />
      <Card
        variant="outlined"
        onPress={() => !saving && setShowIngredients(!showIngredients)}
      >
        <Text
          style={{
            fontSize: theme.typography.size.md,
            fontWeight: "500",
            color: theme.text,
            textAlign: "center",
          }}
        >
          {showIngredients
            ? t("hide_ingredients", { ns: "meals" })
            : t("show_ingredients", { ns: "meals" })}
        </Text>
      </Card>

      {showIngredients && (
        <>
          {meal.ingredients.map((ingredient, idx) => (
            <IngredientBox
              key={idx || ingredient.name + idx}
              ingredient={ingredient}
              editable={false}
              onSave={(updated) => !saving && updateIngredient(idx, updated)}
              onRemove={() => !saving && removeIngredient(idx)}
            />
          ))}
          <SecondaryButton
            label={t("edit_ingredients", { ns: "meals" })}
            onPress={() => !saving && navigation.navigate("ReviewIngredients")}
            disabled={saving}
          />
        </>
      )}

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Checkbox
          checked={saveToMyMeals}
          onChange={!saving ? setSaveToMyMeals : () => {}}
          style={{ marginVertical: theme.spacing.md }}
          disabled={saving}
        />
        <Text style={{ marginLeft: 8 }}>
          {t("add_to_my_meals", { ns: "meals" })}
        </Text>
      </View>

      <View
        style={{
          justifyContent: "space-between",
          gap: 16,
          marginTop: theme.spacing.md,
        }}
      >
        <PrimaryButton
          label={t("save", { ns: "common" })}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
        <ErrorButton
          label={t("cancel", { ns: "common" })}
          onPress={handleCancel}
          loading={saving}
          disabled={saving}
        />
      </View>

      <Modal
        visible={showCancelModal}
        message={t("cancel_result_message", { ns: "meals" })}
        primaryActionLabel={t("confirm", { ns: "common" })}
        onClose={() => setShowCancelModal(false)}
        onPrimaryAction={handleCancelConfirm}
        secondaryActionLabel={t("cancel", { ns: "common" })}
        onSecondaryAction={() => setShowCancelModal(false)}
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
