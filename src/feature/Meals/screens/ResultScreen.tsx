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
} from "@/src/components";
import { useTheme } from "@/src/theme/useTheme";
import { useMealContext } from "@/src/context/MealContext";
import { useUserContext } from "@/src/context/UserContext";
import { useMeals } from "@/src/hooks/useMeals";
import { calculateTotalNutrients } from "@/src/utils/calculateTotalNutrients";
import { useAuthContext } from "@/src/context/AuthContext";
import type { MealType } from "@/src/types/meal";
import { autoMealName } from "@/src/utils/autoMealName";
import { useTranslation } from "react-i18next";

type ResultScreenProps = {
  navigation: any;
};

export default function ResultScreen({ navigation }: ResultScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const { user } = useAuthContext();
  const { meal, setLastScreen, clearMeal, removeIngredient, updateIngredient } =
    useMealContext();
  const { userData } = useUserContext();
  const { addMeal } = useMeals(user?.uid || "");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saveToMyMeals, setSaveToMyMeals] = useState(false);
  const [mealName, setMealName] = useState(meal?.name || autoMealName());
  const [mealType, setMealType] = useState<MealType>(meal?.type || "breakfast");
  const [showIngredients, setShowIngredients] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const image = meal?.photoUrl ?? null;

  useEffect(() => {
    if (user?.uid) setLastScreen(user.uid, "Result");
  }, [setLastScreen, user?.uid]);

  if (!meal || !user?.uid) return null;

  const nutrition = calculateTotalNutrients([meal]);

  const handleSave = async () => {
    if (!userData?.uid || saving) return;
    setSaving(true);
    const newMeal = {
      ...meal,
      cloudId: meal.cloudId,
      user_uid: user.uid,
      name: mealName,
      type: mealType,
      nutrition,
      date: new Date().toISOString(),
      syncState: "pending",
      updatedAt: new Date().toISOString(),
    };
    try {
      await addMeal(newMeal);
      clearMeal(user.uid);
      navigation.navigate("Home");
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (user?.uid) clearMeal(user.uid);
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
