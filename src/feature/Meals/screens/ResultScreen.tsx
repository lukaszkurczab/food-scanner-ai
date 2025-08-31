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
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import { useMeals } from "@hooks/useMeals";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { useAuthContext } from "@/context/AuthContext";
import type { MealType } from "@/types/meal";
import { autoMealName } from "@/utils/autoMealName";
import { useTranslation } from "react-i18next";
import { DateTimeSection } from "../components/DateTimeSection";
import { updateStreakIfThresholdMet } from "@/services/streakService";

type ResultScreenProps = {
  navigation: any;
};

export default function ResultScreen({ navigation }: ResultScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const { uid } = useAuthContext();
  const { meal, setLastScreen, clearMeal, removeIngredient, updateIngredient } =
    useMealDraftContext();
  const { userData } = useUserContext();
  const { addMeal, meals } = useMeals(uid ?? null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saveToMyMeals, setSaveToMyMeals] = useState(false);
  const [mealName, setMealName] = useState(meal?.name || autoMealName());
  const [mealType, setMealType] = useState<MealType>(meal?.type || "breakfast");
  const [showIngredients, setShowIngredients] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [selectedAt, setSelectedAt] = useState<Date>(
    meal?.timestamp ? new Date(meal.timestamp) : new Date()
  );
  const [addedAt, setAddedAt] = useState<Date>(new Date());

  const image = meal?.photoUrl ?? null;

  useEffect(() => {
    if (uid) setLastScreen(uid, "Result");
    console.log("[ResultScreen] mount uid", uid);
  }, [setLastScreen, uid]);

  if (!meal || !uid) {
    console.log("[ResultScreen] missing meal or uid", { hasMeal: !!meal, uid });
    return null;
  }

  const nutrition = calculateTotalNutrients([meal]);

  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const handleSave = async () => {
    if (!userData?.uid || saving) return;
    setSaving(true);

    const nowIso = new Date().toISOString();

    const newMeal = {
      ...meal,
      cloudId: meal.cloudId,
      userUid: uid,
      name: mealName,
      type: mealType,
      timestamp: selectedAt.toISOString(),
      createdAt: addedAt.toISOString(),
      syncState: "pending",
      updatedAt: nowIso,
      source: meal.source ?? "manual",
    } as any;

    try {
      console.log("[ResultScreen] handleSave start", {
        uid,
        selectedAt: selectedAt.toISOString(),
        addedAt: addedAt.toISOString(),
      });

      await addMeal(newMeal, { alsoSaveToMyMeals: saveToMyMeals });
      console.log("[ResultScreen] addMeal done");

      const today = new Date(selectedAt);
      const existingTodayKcal =
        meals
          .filter((m) => isSameLocalDay(new Date(m.timestamp), today))
          .reduce((s, m) => s + Number(m?.totals?.kcal || 0), 0) || 0;

      const mealKcal = Number(calculateTotalNutrients([newMeal]).kcal) || 0;
      const todaysKcal = existingTodayKcal + mealKcal;

      const targetKcal = Number(userData?.calorieTarget || 0);
      console.log("[ResultScreen] streak inputs", {
        existingTodayKcal,
        mealKcal,
        todaysKcal,
        targetKcal,
        thresholdPct: 0.8,
      });

      await updateStreakIfThresholdMet({
        uid,
        todaysKcal,
        targetKcal,
        thresholdPct: 0.8,
      });

      console.log("[ResultScreen] updateStreakIfThresholdMet done");

      clearMeal(uid);
      navigation.navigate("Home");
    } catch (e) {
      console.log("[ResultScreen] handleSave error", e);
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
    <Layout showNavigation={false} disableScroll>
      <View style={{ padding: theme.spacing.container }}>
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

        <DateTimeSection
          value={selectedAt}
          onChange={setSelectedAt}
          addedValue={addedAt}
          onChangeAdded={setAddedAt}
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
              onPress={() =>
                !saving && navigation.navigate("ReviewIngredients")
              }
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
          <Text style={{ color: theme.text }}>
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
