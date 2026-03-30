import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Checkbox,
  Layout,
  Modal,
  PhotoPreview,
} from "@/components";
import AppIcon from "@/components/AppIcon";
import { MacroChip } from "@/components/MacroChip";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import { useMeals } from "@hooks/useMeals";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { useAuthContext } from "@/context/AuthContext";
import { autoMealName } from "@/utils/autoMealName";
import type { Meal } from "@/types/meal";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";

const IMAGE_HEIGHT = 248;

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

export default function ReviewMealScreen({
  navigation,
  flow,
}: MealAddScreenProps<"ReviewMeal">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
    clearMeal(uid);
    navigation.navigate("Home");
  }, [clearMeal, navigation, uid]);

  const handleSave = useCallback(async () => {
    if (!meal || !userData?.uid || saving || !uid) return;

    setSaving(true);
    const nowIso = new Date().toISOString();
    const nextMeal: Meal = {
      ...meal,
      cloudId: meal.cloudId,
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
    <Layout showNavigation={false}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>
          {t("review_meal_eyebrow", {
            ns: "meals",
            defaultValue: "Review meal",
          })}
        </Text>
        <Text style={styles.title}>{resolvedMealName}</Text>
        <Text style={styles.subtitle}>
          {t("review_meal_subtitle", {
            ns: "meals",
            defaultValue: "Check the summary, adjust details if needed, then save.",
          })}
        </Text>
      </View>

      {image ? (
        <View style={styles.imageBlock}>
          <View style={styles.imageWrapper}>
            {checkingImage ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : imageError ? (
              <View style={styles.imageFallback}>
                <AppIcon name="image" size={28} color={theme.textSecondary} />
              </View>
            ) : (
              <Pressable
                onPress={() => !saving && setPreviewVisible(true)}
                disabled={saving}
                style={styles.imagePressable}
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("change_photo", { ns: "meals" })}
            onPress={openCamera}
            style={({ pressed }) => [
              styles.inlineAction,
              pressed ? styles.inlineActionPressed : null,
            ]}
          >
            <AppIcon name="camera" size={18} color={theme.primary} />
            <Text style={styles.inlineActionLabel}>
              {t("change_photo", { ns: "meals" })}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Card style={styles.summaryCard}>
        <View style={styles.macroGrid}>
          <MacroChip kind="kcal" value={nutrition.kcal} style={styles.macroChip} />
          <MacroChip
            kind="protein"
            value={nutrition.protein}
            style={styles.macroChip}
          />
          <MacroChip kind="carbs" value={nutrition.carbs} style={styles.macroChip} />
          <MacroChip kind="fat" value={nutrition.fat} style={styles.macroChip} />
        </View>
      </Card>

      <Card onPress={handleOpenEdit} style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <Text style={styles.sectionTitle}>
            {t("review_meal_details_title", {
              ns: "meals",
              defaultValue: "Meal details",
            })}
          </Text>
          <View style={styles.editAffordance}>
            <Text style={styles.editAffordanceLabel}>
              {t("review_meal_edit_cta", {
                ns: "meals",
                defaultValue: "Edit details",
              })}
            </Text>
            <AppIcon
              name="chevron-right"
              size={16}
              color={theme.textSecondary}
            />
          </View>
        </View>

        <View style={styles.detailRows}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("review_meal_type_label", {
                ns: "meals",
                defaultValue: "Meal type",
              })}
            </Text>
            <Text style={styles.detailValue}>{t(meal.type || "other", { ns: "meals" })}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("review_meal_time_label", {
                ns: "meals",
                defaultValue: "Time",
              })}
            </Text>
            <Text style={styles.detailValue}>
              {formatMealTime(mealTime, i18n.language || "en")}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.ingredientsCard}>
        <Text style={styles.sectionTitle}>
          {t("review_meal_ingredients_title", {
            ns: "meals",
            defaultValue: "Ingredients",
          })}
        </Text>
        <Text style={styles.ingredientsCount}>
          {t("review_meal_ingredients_count", {
            ns: "meals",
            count: ingredientPreview.totalCount,
          })}
        </Text>
        <View style={styles.ingredientPreviewList}>
          {ingredientPreview.items.map((ingredient) => (
            <View key={ingredient.id} style={styles.ingredientPreviewRow}>
              <Text style={styles.ingredientPreviewName}>{ingredient.name}</Text>
              <Text style={styles.ingredientPreviewAmount}>
                {ingredient.amount.toFixed(0)}{ingredient.unit ?? "g"}
              </Text>
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
        </View>
      </Card>

      <View style={styles.rowCenter}>
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

      <View style={styles.footer}>
        <Button
          label={t("save", { ns: "common" })}
          onPress={() => {
            void handleSave();
          }}
          loading={saving}
          disabled={saving}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("review_meal_edit_cta", { ns: "meals" })}
          onPress={handleOpenEdit}
          style={({ pressed }) => [
            styles.secondaryAction,
            pressed ? styles.inlineActionPressed : null,
          ]}
        >
          <Text style={styles.secondaryActionLabel}>
            {t("review_meal_edit_cta", {
              ns: "meals",
              defaultValue: "Edit details",
            })}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("cancel", { ns: "common" })}
          onPress={() => setShowCancelModal(true)}
          style={({ pressed }) => [
            styles.dismissAction,
            pressed ? styles.inlineActionPressed : null,
          ]}
        >
          <Text style={styles.dismissActionLabel}>
            {t("cancel", { ns: "common" })}
          </Text>
        </Pressable>
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
    headerBlock: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    eyebrow: {
      color: theme.primary,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      maxWidth: 360,
    },
    imageBlock: {
      marginBottom: theme.spacing.lg,
      alignItems: "center",
    },
    imageWrapper: {
      width: "100%",
      height: IMAGE_HEIGHT,
      borderRadius: theme.rounded.xl,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.borderSoft,
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
    imageFallback: {
      alignItems: "center",
      justifyContent: "center",
    },
    inlineAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    inlineActionPressed: {
      opacity: 0.72,
    },
    inlineActionLabel: {
      color: theme.primary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
    },
    summaryCard: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    macroGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    macroChip: {
      width: "47%",
    },
    detailsCard: {
      marginBottom: theme.spacing.md,
    },
    detailsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
    },
    editAffordance: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    editAffordanceLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    detailRows: {
      gap: theme.spacing.sm,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    detailLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    detailValue: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: "right",
    },
    ingredientsCard: {
      marginBottom: theme.spacing.sm,
    },
    ingredientsCount: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    ingredientPreviewList: {
      gap: theme.spacing.sm,
    },
    ingredientPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    ingredientPreviewName: {
      flex: 1,
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
    ingredientPreviewAmount: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    ingredientMoreText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    rowCenter: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    checkboxSpacing: {
      marginRight: theme.spacing.sm,
    },
    checkboxLabel: {
      flex: 1,
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
    footer: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
    },
    secondaryAction: {
      alignSelf: "center",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    secondaryActionLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
    },
    dismissAction: {
      alignSelf: "center",
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    dismissActionLabel: {
      color: theme.textTertiary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
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
