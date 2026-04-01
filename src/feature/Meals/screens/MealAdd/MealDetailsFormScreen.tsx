import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { Button, Clock12h, Clock24h, Layout, TextInput } from "@/components";
import AppIcon from "@/components/AppIcon";
import { IngredientEditor } from "@/components/IngredientEditor";
import { MealAddTextLink } from "@/feature/Meals/components/MealAddPhotoScaffold";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import type { Ingredient, Meal, MealType } from "@/types/meal";
import type {
  MealAddFlowApi,
  MealAddScreenName,
} from "@/feature/Meals/feature/MapMealAddScreens";

const mealTypeOptions: Array<{ labelKey: string; value: MealType }> = [
  { value: "breakfast", labelKey: "breakfast" },
  { value: "lunch", labelKey: "lunch" },
  { value: "dinner", labelKey: "dinner" },
  { value: "snack", labelKey: "snack" },
  { value: "other", labelKey: "other" },
];

type Mode = "manual" | "review";

type Props = {
  flow: MealAddFlowApi;
  navigation: {
    navigate: (
      screen: "Home" | "MealAddMethod",
      params?: { selectionMode: "temporary"; origin: "mealAddFlow" },
    ) => void;
  };
  mode: Mode;
};

function isValidIsoDate(value?: string | null) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function getMealDateOrNow(value?: string | null) {
  return isValidIsoDate(value) && value ? new Date(value) : new Date();
}

function formatMealTime(value: Date, locale: string, hour12: boolean) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(value);
}

function formatIngredientAmount(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildDraftIngredient(source?: Ingredient | null): Ingredient {
  return {
    id: source?.id ?? uuidv4(),
    name: source?.name ?? "",
    amount: source?.amount ?? 1,
    unit: source?.unit ?? "g",
    kcal: source?.kcal ?? 0,
    protein: source?.protein ?? 0,
    carbs: source?.carbs ?? 0,
    fat: source?.fat ?? 0,
  };
}

function getResumeTrackingScreen(mode: Mode): MealAddScreenName {
  return mode === "manual" ? "ManualMealEntry" : "EditMealDetails";
}

export function MealDetailsFormScreen({ flow, navigation, mode }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation(["meals", "common"]);
  const { uid } = useAuthContext();
  const { meal, loadDraft, saveDraft, setMeal, setLastScreen } =
    useMealDraftContext();
  const mealTimestamp = meal?.timestamp;
  const isManualMode = mode === "manual";

  const [mealName, setMealName] = useState(meal?.name ?? "");
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [typeDraft, setTypeDraft] = useState<MealType>(meal?.type ?? "other");
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(
    getMealDateOrNow(mealTimestamp),
  );
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<
    number | null
  >(null);
  const [ingredientDraft, setIngredientDraft] = useState<Ingredient | null>(
    null,
  );

  useEffect(() => {
    setMealName(meal?.name ?? "");
  }, [meal?.name]);

  useEffect(() => {
    setTypeDraft(meal?.type ?? "other");
  }, [meal?.type]);

  useEffect(() => {
    if (isValidIsoDate(mealTimestamp) && mealTimestamp) {
      setPickerDate(new Date(mealTimestamp));
    }
  }, [mealTimestamp]);

  useEffect(() => {
    if (uid) {
      void setLastScreen(uid, getResumeTrackingScreen(mode));
    }
  }, [mode, setLastScreen, uid]);

  const retryLoadDraft = useCallback(async () => {
    if (!uid) return;
    await loadDraft(uid);
  }, [loadDraft, uid]);

  const persistMeal = useCallback(
    async (nextMeal: Meal) => {
      setMeal(nextMeal);
      if (uid) {
        await saveDraft(uid, nextMeal);
      }
    },
    [saveDraft, setMeal, uid],
  );

  const persistMealPatch = useCallback(
    async (patch: Partial<Meal>) => {
      if (!meal) return;
      const nextMeal: Meal = {
        ...meal,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await persistMeal(nextMeal);
    },
    [meal, persistMeal],
  );

  const handleNameBlur = useCallback(async () => {
    await persistMealPatch({ name: mealName.trim() || null });
  }, [mealName, persistMealPatch]);

  const handleOpenTypePicker = useCallback(() => {
    setTypeDraft(meal?.type ?? "other");
    setTypePickerVisible(true);
  }, [meal?.type]);

  const handleCloseTypePicker = useCallback(() => {
    setTypePickerVisible(false);
    setTypeDraft(meal?.type ?? "other");
  }, [meal?.type]);

  const handleApplyType = useCallback(
    async (nextType: MealType) => {
      await persistMealPatch({ type: nextType });
      setTypePickerVisible(false);
    },
    [persistMealPatch],
  );

  const handleCloseTimePicker = useCallback(() => {
    setPickerDate(getMealDateOrNow(mealTimestamp));
    setTimePickerVisible(false);
  }, [mealTimestamp]);

  const handleOpenTimePicker = useCallback(() => {
    setPickerDate(getMealDateOrNow(mealTimestamp));
    setTimePickerVisible(true);
  }, [mealTimestamp]);

  const handleSaveTime = useCallback(async () => {
    const baseDate = getMealDateOrNow(mealTimestamp);
    const nextTimestamp = new Date(baseDate);
    nextTimestamp.setHours(
      pickerDate.getHours(),
      pickerDate.getMinutes(),
      0,
      0,
    );

    await persistMealPatch({ timestamp: nextTimestamp.toISOString() });
    setTimePickerVisible(false);
  }, [mealTimestamp, persistMealPatch, pickerDate]);

  const handleOpenIngredientEditor = useCallback(
    (index: number | null) => {
      const source =
        index === null ? null : ((meal?.ingredients ?? [])[index] ?? null);
      setEditingIngredientIndex(index);
      setIngredientDraft(buildDraftIngredient(source));
    },
    [meal?.ingredients],
  );

  const handleCloseIngredientEditor = useCallback(() => {
    setEditingIngredientIndex(null);
    setIngredientDraft(null);
  }, []);

  const handleCommitIngredient = useCallback(
    async (updated: Ingredient) => {
      if (!meal) return;

      const currentIngredients = meal.ingredients ?? [];
      const nextIngredients =
        editingIngredientIndex === null
          ? [...currentIngredients, updated]
          : currentIngredients.map((ingredient, index) =>
              index === editingIngredientIndex ? updated : ingredient,
            );

      await persistMeal({
        ...meal,
        ingredients: nextIngredients,
        updatedAt: new Date().toISOString(),
      });
      handleCloseIngredientEditor();
    },
    [editingIngredientIndex, handleCloseIngredientEditor, meal, persistMeal],
  );

  const handleDeleteIngredient = useCallback(async () => {
    if (!meal || editingIngredientIndex === null) return;

    await persistMeal({
      ...meal,
      ingredients: (meal.ingredients ?? []).filter(
        (_ingredient, index) => index !== editingIngredientIndex,
      ),
      updatedAt: new Date().toISOString(),
    });
    handleCloseIngredientEditor();
  }, [editingIngredientIndex, handleCloseIngredientEditor, meal, persistMeal]);

  const handleSubmit = useCallback(async () => {
    const trimmedName = mealName.trim();

    if (!isManualMode) {
      await persistMealPatch({ name: trimmedName || null });
      flow.goBack();
      return;
    }

    if (!meal || !uid || !trimmedName) {
      return;
    }

    const nowIso = new Date().toISOString();
    const nextMeal: Meal = {
      ...meal,
      userUid: uid,
      name: trimmedName,
      type: meal.type || "other",
      timestamp: pickerDate.toISOString(),
      createdAt: meal.createdAt || nowIso,
      updatedAt: nowIso,
      syncState: "pending",
      source: "manual",
      inputMethod: meal.inputMethod ?? "manual",
    };

    await persistMeal(nextMeal);
    flow.replace("ReviewMeal", {});
  }, [
    flow,
    isManualMode,
    meal,
    mealName,
    persistMealPatch,
    persistMeal,
    pickerDate,
    uid,
  ]);

  const handleChangeMethod = useCallback(() => {
    navigation.navigate("MealAddMethod", {
      selectionMode: "temporary",
      origin: "mealAddFlow",
    });
  }, [navigation]);

  const selectedAt = getMealDateOrNow(mealTimestamp);

  const locale = i18n?.language || "en";
  const prefers12h = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        timeZone: "UTC",
      }).formatToParts(new Date(Date.UTC(2020, 0, 1, 13)));
      return parts.some((part) => part.type === "dayPeriod");
    } catch {
      return false;
    }
  }, [locale]);

  const mealTypeLabel = t(meal?.type ?? "other", { ns: "meals" });
  const mealTimeLabel = formatMealTime(selectedAt, locale, prefers12h);
  const ingredients = meal?.ingredients ?? [];
  const manualSubmitDisabled = !uid || !meal || mealName.trim().length === 0;

  if (!meal || !uid) {
    return (
      <Layout showNavigation={false}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {t("resultUnavailable.title", { ns: "meals" })}
          </Text>
          <Text style={styles.emptyDescription}>
            {!uid
              ? t("resultUnavailable.authDesc", { ns: "meals" })
              : t("resultUnavailable.desc", { ns: "meals" })}
          </Text>
          <Button
            label={t("retry", { ns: "common" })}
            onPress={() => {
              void retryLoadDraft();
            }}
            disabled={!uid}
            style={styles.emptyAction}
          />
          <Button
            variant="secondary"
            label={
              isManualMode
                ? t("back_home", { ns: "meals" })
                : t("review_meal_edit_done", {
                    ns: "meals",
                    defaultValue: "Back to review",
                  })
            }
            onPress={() =>
              isManualMode ? navigation.navigate("Home") : flow.goBack()
            }
            style={styles.emptyAction}
          />
        </View>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.title}>
              {isManualMode
                ? t("manual_entry_title", {
                    ns: "meals",
                    defaultValue: "Add meal manually",
                  })
                : t("review_meal_edit_screen_title", {
                    ns: "meals",
                    defaultValue: "Edit meal details",
                  })}
            </Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>
              {t("review_meal_edit_meal_basics", {
                ns: "meals",
                defaultValue: "Meal basics",
              })}
            </Text>

            <TextInput
              testID="meal-name-input"
              label={t("meal_name", { ns: "meals" })}
              value={mealName}
              onChangeText={setMealName}
              onBlur={() => {
                void handleNameBlur();
              }}
              placeholder={t("manual_meal_name_placeholder", {
                ns: "meals",
                defaultValue: "Enter meal name",
              })}
              autoCapitalize="words"
              autoCorrect={false}
              spellCheck={false}
              maxLength={80}
            />

            <View style={styles.fieldRow}>
              <Pressable
                accessibilityRole="button"
                onPress={handleOpenTypePicker}
                style={({ pressed }) => [
                  styles.selectionField,
                  pressed ? styles.selectionFieldPressed : null,
                ]}
              >
                <View style={styles.selectionCopy}>
                  <Text style={styles.fieldLabel}>
                    {t("review_meal_type_label", {
                      ns: "meals",
                      defaultValue: "Meal type",
                    })}
                  </Text>
                  <Text style={styles.selectionValue}>{mealTypeLabel}</Text>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={18}
                  color={theme.textSecondary}
                  style={{ transform: [{ rotate: "-90deg" }] }}
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleOpenTimePicker}
                style={({ pressed }) => [
                  styles.selectionField,
                  pressed ? styles.selectionFieldPressed : null,
                ]}
              >
                <View style={styles.selectionCopy}>
                  <Text style={styles.fieldLabel}>
                    {t("review_meal_time_label", {
                      ns: "meals",
                      defaultValue: "Time",
                    })}
                  </Text>
                  <Text style={styles.selectionValue}>{mealTimeLabel}</Text>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={18}
                  color={theme.textSecondary}
                  style={{ transform: [{ rotate: "-90deg" }] }}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.ingredientsHeader}>
              <Text style={styles.ingredientsTitle}>
                {t("review_meal_ingredients_title", {
                  ns: "meals",
                  defaultValue: "Ingredients",
                })}
              </Text>
              <Text style={styles.ingredientsSubtitle}>
                {isManualMode
                  ? t("manual_entry_ingredients_subtitle", {
                      ns: "meals",
                      defaultValue:
                        "Ingredients are optional. Add what you know.",
                    })
                  : t("review_meal_edit_ingredients_subtitle", {
                      ns: "meals",
                      defaultValue:
                        "Edit items and amounts. Totals update below.",
                    })}
              </Text>
            </View>

            {ingredients.length > 0 ? (
              <View style={styles.ingredientsList}>
                {ingredients.map((ingredient, index) => (
                  <Pressable
                    key={ingredient.id || `ingredient-${index}`}
                    accessibilityRole="button"
                    onPress={() => handleOpenIngredientEditor(index)}
                    style={({ pressed }) => [
                      styles.ingredientRow,
                      pressed ? styles.selectionFieldPressed : null,
                    ]}
                  >
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <View style={styles.ingredientMeta}>
                      <Text style={styles.ingredientAmount}>
                        {`${formatIngredientAmount(ingredient.amount)}${ingredient.unit ?? "g"}`}
                      </Text>
                      <AppIcon
                        name="chevron-right"
                        size={18}
                        color={theme.textSecondary}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.emptyIngredientsCard}>
                <Text style={styles.emptyIngredientsTitle}>
                  {t("review_meal_edit_no_ingredients_title", {
                    ns: "meals",
                    defaultValue: "No ingredients yet",
                  })}
                </Text>
                <Text style={styles.emptyIngredientsDescription}>
                  {isManualMode
                    ? t("manual_entry_no_ingredients_description", {
                        ns: "meals",
                        defaultValue:
                          "Add the main ingredients for a better estimate.",
                      })
                    : t("review_meal_edit_no_ingredients_description", {
                        ns: "meals",
                        defaultValue:
                          "Add ingredients if you want to refine nutrition.",
                      })}
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => handleOpenIngredientEditor(null)}
              style={({ pressed }) => [
                styles.addIngredientAction,
                pressed ? styles.selectionFieldPressed : null,
              ]}
            >
              <Text style={styles.addIngredientPlus}>+</Text>
              <Text style={styles.addIngredientLabel}>
                {t(
                  ingredients.length > 0
                    ? "add_ingredient"
                    : "review_meal_edit_add_first_ingredient",
                  {
                    ns: "meals",
                    defaultValue:
                      ingredients.length > 0
                        ? "Add ingredient"
                        : "Add first ingredient",
                  },
                )}
              </Text>
            </Pressable>
          </View>

          {isManualMode ? (
            <View style={styles.helperPill}>
              <Text style={styles.helperPillText}>
                {t("manual_entry_name_only_hint", {
                  ns: "meals",
                  defaultValue: "You can save with just a meal name",
                })}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={
              isManualMode
                ? t("manual_entry_primary_cta", {
                    ns: "meals",
                    defaultValue: "Prepare review",
                  })
                : t("review_meal_edit_done", {
                    ns: "meals",
                    defaultValue: "Back to review",
                  })
            }
            onPress={() => {
              void handleSubmit();
            }}
            disabled={isManualMode ? manualSubmitDisabled : false}
            testID={isManualMode ? "manual-meal-save-button" : undefined}
          />
          {isManualMode ? (
            <MealAddTextLink
              label={t("change_method", {
                ns: "meals",
                defaultValue: "Change add method",
              })}
              onPress={handleChangeMethod}
              testID="manual-change-method-button"
            />
          ) : null}
        </View>
      </View>

      <RNModal
        transparent
        animationType="fade"
        visible={typePickerVisible}
        onRequestClose={handleCloseTypePicker}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={handleCloseTypePicker}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {t("review_meal_type_label", {
                ns: "meals",
                defaultValue: "Meal type",
              })}
            </Text>
            <View style={styles.sheetOptionList}>
              {mealTypeOptions.map((option) => {
                const selected = option.value === typeDraft;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    onPress={() => setTypeDraft(option.value)}
                    style={({ pressed }) => [
                      styles.sheetOption,
                      selected ? styles.sheetOptionSelected : null,
                      pressed ? styles.selectionFieldPressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sheetOptionLabel,
                        selected ? styles.sheetOptionLabelSelected : null,
                      ]}
                    >
                      {t(option.labelKey, { ns: "meals" })}
                    </Text>
                    {selected ? (
                      <AppIcon name="check" size={18} color={theme.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.sheetActions}>
              <Button
                variant="secondary"
                label={t("cancel", { ns: "common" })}
                onPress={handleCloseTypePicker}
                style={styles.sheetActionButton}
                fullWidth={false}
              />
              <Button
                label={t("apply", {
                  ns: "common",
                  defaultValue: "Apply",
                })}
                onPress={() => {
                  void handleApplyType(typeDraft);
                }}
                style={styles.sheetActionButton}
                fullWidth={false}
              />
            </View>
          </View>
        </View>
      </RNModal>

      <RNModal
        transparent
        animationType="fade"
        visible={timePickerVisible}
        onRequestClose={handleCloseTimePicker}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={handleCloseTimePicker}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {t("meal_time", { ns: "meals", defaultValue: "Meal time" })}
            </Text>

            {prefers12h ? (
              <Clock12h value={pickerDate} onChange={setPickerDate} />
            ) : (
              <Clock24h value={pickerDate} onChange={setPickerDate} />
            )}

            <Text style={styles.sheetHelperText}>
              {t("review_meal_time_sheet_hint", {
                ns: "meals",
                defaultValue: "Adjust the meal time, then apply.",
              })}
            </Text>

            <View style={styles.sheetActions}>
              <Button
                variant="secondary"
                label={t("cancel", { ns: "common" })}
                onPress={handleCloseTimePicker}
                style={styles.sheetActionButton}
                fullWidth={false}
              />
              <Button
                label={t("apply", {
                  ns: "common",
                  defaultValue: "Apply",
                })}
                onPress={() => {
                  void handleSaveTime();
                }}
                style={styles.sheetActionButton}
                fullWidth={false}
              />
            </View>
          </View>
        </View>
      </RNModal>

      <RNModal
        transparent
        animationType="fade"
        visible={ingredientDraft !== null}
        onRequestClose={handleCloseIngredientEditor}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={handleCloseIngredientEditor}
          />
          <View style={[styles.sheet, styles.ingredientSheet]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {t(
                editingIngredientIndex === null
                  ? "review_meal_edit_add_ingredient"
                  : "review_meal_edit_ingredient_title",
                {
                  ns: "meals",
                  defaultValue:
                    editingIngredientIndex === null
                      ? "Add ingredient"
                      : "Edit ingredient",
                },
              )}
            </Text>
            {ingredientDraft ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.ingredientEditorContent}
              >
                <IngredientEditor
                  key={ingredientDraft.id}
                  initial={ingredientDraft}
                  variant="sheet"
                  submitLabel={t(
                    editingIngredientIndex === null
                      ? "add_ingredient"
                      : "save_changes",
                    {
                      ns: editingIngredientIndex === null ? "meals" : "common",
                      defaultValue:
                        editingIngredientIndex === null
                          ? "Add ingredient"
                          : "Save changes",
                    },
                  )}
                  showDelete={editingIngredientIndex !== null}
                  onCommit={(updated) => {
                    void handleCommitIngredient(updated);
                  }}
                  onCancel={handleCloseIngredientEditor}
                  onDelete={() => {
                    void handleDeleteIngredient();
                  }}
                />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </RNModal>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingLeft: theme.spacing.screenPaddingWide,
      paddingRight: theme.spacing.screenPaddingWide,
    },
    screen: {
      flex: 1,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xxxl + 92,
    },
    headerBlock: {
      marginBottom: theme.spacing.xs,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: 32,
      fontFamily: theme.typography.fontFamily.bold,
    },
    sectionBlock: {
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.medium,
    },
    fieldRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    fieldLabel: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 14,
      fontFamily: theme.typography.fontFamily.medium,
    },
    selectionField: {
      flex: 1,
      minHeight: 54,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.surface,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs + 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.xs,
    },
    selectionFieldPressed: {
      opacity: 0.72,
    },
    selectionCopy: {
      flex: 1,
      gap: 2,
    },
    selectionValue: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.medium,
    },
    ingredientsHeader: {
      gap: 3,
    },
    ingredientsTitle: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    ingredientsSubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      maxWidth: 280,
    },
    ingredientsList: {
      gap: theme.spacing.xs,
    },
    ingredientRow: {
      minHeight: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.background,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.sm - 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    ingredientName: {
      flex: 1,
      color: theme.text,
      fontSize: 15,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.medium,
    },
    ingredientMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    ingredientAmount: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    emptyIngredientsCard: {
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.background,
      padding: theme.spacing.md,
      gap: theme.spacing.xxs,
    },
    emptyIngredientsTitle: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    emptyIngredientsDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    addIngredientAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      alignSelf: "flex-start",
      minHeight: 24,
    },
    addIngredientPlus: {
      color: theme.primary,
      fontSize: 18,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.medium,
    },
    addIngredientLabel: {
      color: theme.primary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    helperPill: {
      borderRadius: theme.rounded.md,
      backgroundColor: theme.success.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    helperPillText: {
      color: theme.success.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: "center",
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
      backgroundColor: theme.background,
    },
    sheetOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.isDark
        ? "rgba(0, 0, 0, 0.48)"
        : "rgba(47, 49, 43, 0.42)",
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: theme.rounded.xxl,
      borderTopRightRadius: theme.rounded.xxl,
      paddingTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.bottomSheetPadding,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.4 : 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12,
    },
    ingredientSheet: {
      maxHeight: "76%",
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.borderSoft,
      alignSelf: "center",
    },
    sheetTitle: {
      color: theme.text,
      fontSize: 20,
      lineHeight: 26,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    sheetOptionList: {
      gap: theme.spacing.sm,
    },
    sheetOption: {
      minHeight: 46,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.background,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sheetOptionSelected: {
      borderColor: theme.primarySoft,
    },
    sheetOptionLabel: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
    },
    sheetOptionLabelSelected: {
      color: theme.primary,
    },
    sheetActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    sheetActionButton: {
      flex: 1,
    },
    sheetHelperText: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      textAlign: "center",
      marginTop: -theme.spacing.xs,
    },
    ingredientEditorContent: {
      paddingBottom: theme.spacing.sm,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.screenPadding,
      paddingBottom: theme.spacing.xl,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      textAlign: "center",
      maxWidth: 320,
    },
    emptyAction: {
      alignSelf: "stretch",
    },
  });
