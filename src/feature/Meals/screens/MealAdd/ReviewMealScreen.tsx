import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  Layout,
  Modal,
  PhotoPreview,
  TextButton,
} from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import { useMeals } from "@hooks/useMeals";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { useAuthContext } from "@/context/AuthContext";
import { autoMealName } from "@/utils/autoMealName";
import type { Meal } from "@/types/meal";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";

const IMAGE_HEIGHT = 164;

function isValidIsoDate(value?: string | null) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function formatMealTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatIngredientValue(amount?: number, unit?: string) {
  if (!Number.isFinite(amount)) return unit ?? "";
  const value = Number.isInteger(amount ?? 0)
    ? String(amount)
    : (amount ?? 0).toFixed(1);
  return `${value}${unit ? ` ${unit}` : ""}`.trim();
}

export default function ReviewMealScreen({
  navigation,
  flow,
}: MealAddScreenProps<"ReviewMeal">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const keyboardDismissMode: "none" | "interactive" | "on-drag" =
    Platform.OS === "ios" ? "interactive" : "on-drag";
  const { t, i18n } = useTranslation(["meals", "common"]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const { uid } = useAuthContext();
  const { userData } = useUserContext();
  const { addMeal } = useMeals(uid ?? null);
  const { meal, clearMeal, loadDraft, saveDraft, setLastScreen, setPhotoUrl } =
    useMealDraftContext();

  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [saveToMyMeals, setSaveToMyMeals] = useState(meal?.source === "saved");

  const image = meal?.photoUrl ?? null;
  const isFromSaved = meal?.source === "saved";

  useEffect(() => {
    setSaveToMyMeals(isFromSaved);
  }, [isFromSaved]);

  useEffect(() => {
    if (uid) {
      void setLastScreen(uid, "AddMeal");
    }
  }, [setLastScreen, uid]);

  useEffect(() => {
    setImageError(false);
  }, [image]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      const actionType = e.data.action.type;
      const isBackAction =
        actionType === "GO_BACK" ||
        actionType === "POP" ||
        actionType === "POP_TO_TOP";

      if (!isBackAction) return;

      e.preventDefault();

      if (previewVisible) {
        setPreviewVisible(false);
        return;
      }

      if (!showCancelModal) {
        setShowCancelModal(true);
      }
    });

    return sub;
  }, [navigation, previewVisible, showCancelModal]);

  useEffect(() => {
    const onBackPress = () => {
      if (previewVisible) {
        setPreviewVisible(false);
        return true;
      }

      if (showCancelModal) {
        setShowCancelModal(false);
        return true;
      }

      setShowCancelModal(true);
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [previewVisible, showCancelModal]);

  useEffect(() => {
    const photoUrl = meal?.photoUrl;
    if (!photoUrl || !uid) return;

    let cancelled = false;

    const validateLocalImage = async () => {
      setCheckingImage(true);
      try {
        const isLocal =
          photoUrl.startsWith("file://") || photoUrl.startsWith("content://");
        if (!isLocal) return;

        const info = await FileSystem.getInfoAsync(photoUrl);
        if (!info.exists && !cancelled) {
          setPhotoUrl(null);
          await saveDraft(uid, { ...meal, photoUrl: null });
        }
      } finally {
        if (!cancelled) setCheckingImage(false);
      }
    };

    void validateLocalImage();

    return () => {
      cancelled = true;
    };
  }, [meal, saveDraft, setPhotoUrl, uid]);

  const retryLoadDraft = useCallback(async () => {
    if (!uid) return;
    await loadDraft(uid);
  }, [loadDraft, uid]);

  const resolvedMealName = useMemo(() => {
    const candidate = meal?.name?.trim();
    return candidate || autoMealName();
  }, [meal?.name]);

  const mealTime = useMemo(
    () =>
      isValidIsoDate(meal?.timestamp) ? new Date(meal?.timestamp as string) : new Date(),
    [meal?.timestamp],
  );

  const nutrition = useMemo(
    () => calculateTotalNutrients(meal ? [meal] : []),
    [meal],
  );

  const ingredientPreview = useMemo(() => {
    const items = meal?.ingredients ?? [];
    return {
      items: items.slice(0, 3),
      remainingCount: Math.max(items.length - 3, 0),
      totalCount: items.length,
    };
  }, [meal?.ingredients]);

  const openCamera = useCallback(() => {
    if (!meal) return;
    flow.goTo("CameraDefault", {
      id: meal.mealId,
      skipDetection: true,
    });
  }, [flow, meal]);

  const handleOpenEdit = useCallback(() => {
    flow.goTo("EditMealDetails", {});
  }, [flow]);

  const handleCancelConfirm = useCallback(() => {
    if (!uid) return;
    setShowCancelModal(false);
    clearMeal(uid);
    navigation.navigate("Home");
  }, [clearMeal, navigation, uid]);

  const handleSave = useCallback(async (openShareComposer: boolean) => {
    if (!meal || !userData?.uid || saving || !uid) return;

    setSaving(true);
    const nowIso = new Date().toISOString();
    const stableMealId =
      meal.mealId || meal.cloudId || `meal-${Date.now().toString(36)}`;
    const stableCloudId =
      meal.cloudId || meal.mealId || `cloud-${Date.now().toString(36)}`;
    const nextMeal: Meal = {
      ...meal,
      mealId: stableMealId,
      cloudId: stableCloudId,
      userUid: uid,
      name: resolvedMealName,
      type: meal.type || "other",
      timestamp: mealTime.toISOString(),
      createdAt: meal.createdAt || nowIso,
      updatedAt: nowIso,
      syncState: "pending",
      source: meal.source ?? "manual",
    };

    try {
      await addMeal(nextMeal, { alsoSaveToMyMeals: saveToMyMeals });
      clearMeal(uid);
      if (openShareComposer && nextMeal.photoUrl) {
        navigation.navigate("MealShare", {
          meal: nextMeal,
          returnTo: "ReviewMeal",
        });
        return;
      }
      navigation.navigate("Home");
    } catch {
      setSaving(false);
    }
  }, [
    addMeal,
    clearMeal,
    meal,
    mealTime,
    navigation,
    resolvedMealName,
    saveToMyMeals,
    saving,
    uid,
    userData?.uid,
  ]);

  const mealMetaLabel = useMemo(() => {
    return `${t(meal?.type || "other", { ns: "meals" })} • ${formatMealTime(
      mealTime,
      i18n.language || "en",
    )}`;
  }, [i18n.language, meal?.type, mealTime, t]);

  const needsQuickCheck =
    meal?.source === "ai" &&
    typeof meal.aiMeta?.confidence === "number" &&
    meal.aiMeta.confidence < 0.8;

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
              : isOnline
                ? t("resultUnavailable.desc", { ns: "meals" })
                : t("resultUnavailable.offlineDesc", { ns: "meals" })}
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
            label={t("back_home", { ns: "meals" })}
            onPress={() => navigation.navigate("Home")}
            style={styles.emptyAction}
          />
        </View>
      </Layout>
    );
  }

  if (previewVisible && image) {
    return (
      <PhotoPreview
        photoUri={image}
        onRetake={() => setPreviewVisible(false)}
        onAccept={() => {
          setPreviewVisible(false);
          openCamera();
        }}
        isLoading={false}
        secondaryText={t("back", { ns: "common" })}
        primaryText={t("change_photo", { ns: "meals" })}
      />
    );
  }

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={keyboardDismissMode}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {image && !imageError ? (
            <View style={styles.heroBlock}>
              <View style={styles.imageWrapper}>
                {checkingImage ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <Pressable
                    onPress={() => !saving && setPreviewVisible(true)}
                    disabled={saving}
                    style={styles.imagePressable}
                    testID="review-meal-photo"
                  >
                    <Image
                      key={image}
                      source={{ uri: image }}
                      style={styles.image}
                      resizeMode="cover"
                      onError={() => setImageError(true)}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}

          {needsQuickCheck ? (
            <View style={styles.reviewNote}>
              <View style={styles.reviewNoteDot} />
              <Text style={styles.reviewNoteText}>
                {t("review_meal_quick_check_note", {
                  ns: "meals",
                  defaultValue: "If something looks off, edit details before saving.",
                })}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryBlock}>
            <View style={styles.identityBlock}>
              <Text style={styles.metaLabel}>{mealMetaLabel}</Text>
              <Text style={styles.title}>{resolvedMealName}</Text>
            </View>

            <View style={styles.nutritionCard}>
              <Text style={styles.kcalValue}>{`${nutrition.kcal} kcal`}</Text>
              <View style={styles.macroStats}>
                <View style={styles.macroStat}>
                  <Text style={styles.macroStatLabel}>
                    {t("protein", { ns: "meals", defaultValue: "Protein" }).toUpperCase()}
                  </Text>
                  <Text style={styles.macroStatValue}>{`${nutrition.protein}g`}</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={styles.macroStatLabel}>
                    {t("carbs", { ns: "meals", defaultValue: "Carbs" }).toUpperCase()}
                  </Text>
                  <Text style={styles.macroStatValue}>{`${nutrition.carbs}g`}</Text>
                </View>
                <View style={styles.macroStat}>
                  <Text style={styles.macroStatLabel}>
                    {t("fat", { ns: "meals", defaultValue: "Fat" }).toUpperCase()}
                  </Text>
                  <Text style={styles.macroStatValue}>{`${nutrition.fat}g`}</Text>
                </View>
              </View>
            </View>

            <View style={styles.itemsCard}>
              {ingredientPreview.items.length > 0 ? (
                <>
                  {ingredientPreview.items.map((ingredient, index) => (
                    <View key={ingredient.id} style={styles.itemRow}>
                      <Text style={styles.itemName}>{ingredient.name}</Text>
                      <Text style={styles.itemValue}>
                        {formatIngredientValue(ingredient.amount, ingredient.unit)}
                      </Text>
                      {index < ingredientPreview.items.length - 1 ||
                      ingredientPreview.remainingCount > 0 ? (
                        <View style={styles.itemDivider} />
                      ) : null}
                    </View>
                  ))}
                  {ingredientPreview.remainingCount > 0 ? (
                    <Text style={styles.ingredientMoreText}>
                      {t("review_meal_ingredients_more", {
                        ns: "meals",
                        count: ingredientPreview.remainingCount,
                        defaultValue: "+{{count}} more",
                      })}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.emptyIngredientsText}>
                  {t("review_meal_edit_no_ingredients_title", {
                    ns: "meals",
                    defaultValue: "No ingredients yet",
                  })}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <Checkbox
              checked={saveToMyMeals}
              onChange={!saving ? setSaveToMyMeals : () => {}}
              style={styles.checkboxSpacing}
              disabled={saving}
            />
            <Text style={styles.checkboxLabel}>
              {isFromSaved
                ? t("update_in_my_meals", {
                    ns: "meals",
                    defaultValue: "Update in My Meals",
                  })
                : t("add_to_my_meals", { ns: "meals" })}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="secondary"
            label={t("review_meal_edit_cta", {
              ns: "meals",
              defaultValue: "Edit details",
            })}
            accessibilityLabel={t("review_meal_edit_cta", { ns: "meals" })}
            onPress={handleOpenEdit}
            disabled={saving}
            style={styles.editButton}
          />
          <Button
            label={t("review_meal_save_cta", {
              ns: "meals",
              defaultValue: "Save meal",
            })}
            onPress={() => {
              void handleSave(false);
            }}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            testID="meal-result-save-button"
          />
          {!!image ? (
            <TextButton
              label={t("review_meal_save_share_cta", {
                ns: "meals",
                defaultValue: "Save and share",
              })}
              tone="link"
              onPress={() => {
                void handleSave(true);
              }}
              disabled={saving}
              style={styles.shareAfterSaveButton}
              accessibilityLabel={t("review_meal_save_share_cta", {
                ns: "meals",
                defaultValue: "Save and share",
              })}
            />
          ) : null}
        </View>
      </View>

      <Modal
        visible={showCancelModal}
        title={t("confirm_exit_title", { ns: "meals" })}
        message={t("confirm_exit_message", { ns: "meals" })}
        primaryAction={{
          label: t("leave", { ns: "common" }),
          onPress: handleCancelConfirm,
          tone: "destructive",
        }}
        secondaryAction={{
          label: t("cancel", { ns: "common" }),
          onPress: () => setShowCancelModal(false),
        }}
        onClose={() => setShowCancelModal(false)}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingLeft: theme.spacing.screenPaddingWide,
      paddingRight: theme.spacing.screenPaddingWide,
      paddingBottom: 0,
    },
    screen: {
      flex: 1,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xxxl + 104,
      gap: theme.spacing.md,
    },
    heroBlock: {
      gap: theme.spacing.sm,
    },
    imageWrapper: {
      width: "100%",
      height: IMAGE_HEIGHT,
      borderRadius: theme.rounded.xl + 2,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceAlt,
    },
    imagePressable: {
      width: "100%",
      height: "100%",
    },
    image: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.borderSoft,
    },
    reviewNote: {
      minHeight: 54,
      borderRadius: theme.rounded.md,
      backgroundColor: theme.warning.surface,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    reviewNoteDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.accentWarm,
      marginTop: 6,
    },
    reviewNoteText: {
      flex: 1,
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.medium,
    },
    summaryBlock: {
      gap: theme.spacing.md,
    },
    identityBlock: {
      gap: theme.spacing.xs,
    },
    metaLabel: {
      color: theme.primary,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.medium,
    },
    title: {
      color: theme.text,
      fontSize: 26,
      lineHeight: 32,
      fontFamily: theme.typography.fontFamily.bold,
    },
    nutritionCard: {
      minHeight: 104,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.primary + "3d",
      backgroundColor: theme.surface,
      paddingHorizontal: 18,
      paddingVertical: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    kcalValue: {
      color: theme.text,
      fontSize: 28,
      lineHeight: 34,
      fontFamily: theme.typography.fontFamily.bold,
    },
    macroStats: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
    },
    macroStat: {
      alignItems: "center",
      gap: 4,
    },
    macroStatLabel: {
      color: theme.primary,
      fontSize: 10,
      lineHeight: 12,
      fontFamily: theme.typography.fontFamily.medium,
      letterSpacing: 0.3,
    },
    macroStatValue: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.medium,
    },
    itemsCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.primary + "59",
      backgroundColor: theme.surface,
      padding: 18,
      gap: 9,
    },
    itemRow: {
      gap: theme.spacing.xs,
    },
    itemDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginTop: theme.spacing.xs,
    },
    itemName: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.medium,
    },
    itemValue: {
      position: "absolute",
      right: 0,
      top: 0,
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 20,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: "right",
    },
    ingredientMoreText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    emptyIngredientsText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
    preferenceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    checkboxSpacing: {
      marginRight: 0,
    },
    checkboxLabel: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    editButton: {
      minHeight: 48,
      borderRadius: 14,
    },
    saveButton: {
      minHeight: 54,
      borderRadius: 14,
    },
    shareAfterSaveButton: {
      alignSelf: "center",
      marginTop: -2,
    },
    pressed: {
      opacity: 0.82,
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
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      textAlign: "center",
      lineHeight: Math.round(theme.typography.size.bodyS * 1.5),
    },
    emptyAction: {
      alignSelf: "stretch",
    },
  });
