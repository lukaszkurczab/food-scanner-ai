import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";
import {
  MealBox,
  PrimaryButton,
  Checkbox,
  Layout,
  ErrorButton,
  Modal,
  PhotoPreview,
} from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import { useMeals } from "@hooks/useMeals";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { useAuthContext } from "@/context/AuthContext";
import type { Meal, MealType } from "@/types/meal";
import { autoMealName } from "@/utils/autoMealName";
import { useTranslation } from "react-i18next";
import { DateTimeSection } from "@/components/DateTimeSection";
import { updateStreakIfThresholdMet } from "@/services/streakService";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import ReviewIngredientsEditor from "@/components/ReviewIngredientsEditor";
import { MaterialIcons } from "@expo/vector-icons";

const IMAGE_SIZE = 220;

export default function ResultScreen({
  navigation,
  flow,
}: MealAddScreenProps<"Result">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals", "common"]);
  const { uid } = useAuthContext();
  const { meal, setLastScreen, clearMeal, saveDraft, setPhotoUrl } =
    useMealDraftContext();
  const { userData } = useUserContext();
  const { addMeal, meals } = useMeals(uid ?? null);

  const isFromSaved = meal?.source === "saved";
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saveToMyMeals, setSaveToMyMeals] = useState(isFromSaved);
  const [mealName, setMealName] = useState(meal?.name || autoMealName());
  const [mealType, setMealType] = useState<MealType>(meal?.type || "breakfast");
  const [saving, setSaving] = useState(false);
  const [selectedAt, setSelectedAt] = useState<Date>(
    meal?.timestamp ? new Date(meal.timestamp) : new Date(),
  );
  const [addedAt, setAddedAt] = useState<Date>(new Date());
  const [previewVisible, setPreviewVisible] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  const image = meal?.photoUrl ?? null;

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
    if (!photoUrl) return;

    const validateLocalImage = async () => {
      setCheckingImage(true);
      try {
        const isLocal =
          photoUrl.startsWith("file://") || photoUrl.startsWith("content://");
        if (!isLocal) {
          return;
        }

        const info = await FileSystem.getInfoAsync(photoUrl);
        if (!info.exists) {
          setPhotoUrl(null);
          if (uid) await saveDraft(uid);
        }
      } finally {
        setCheckingImage(false);
      }
    };
    void validateLocalImage();
  }, [meal?.photoUrl, saveDraft, setPhotoUrl, uid]);

  const openCamera = useCallback(() => {
    flow.goTo("MealCamera", {
      skipDetection: true,
      returnTo: "Result",
    });
  }, [flow]);

  if (!meal || !uid) return null;

  const nutrition = calculateTotalNutrients([meal]);

  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const goShare = () => {
    const passMeal: Meal = {
      ...meal,
      name: mealName,
      type: mealType,
      timestamp: selectedAt.toISOString(),
    };
    navigation.navigate("MealShare", { meal: passMeal, returnTo: "Result" });
  };

  const handleSave = async () => {
    if (!userData?.uid || saving) return;
    setSaving(true);

    const nowIso = new Date().toISOString();
    const newMeal: Meal = {
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
    };

    try {
      await addMeal(newMeal, { alsoSaveToMyMeals: saveToMyMeals });

      const today = new Date(selectedAt);
      const existingTodayKcal =
        meals
          .filter((m) => isSameLocalDay(new Date(m.timestamp), today))
          .reduce((s, m) => s + Number(m?.totals?.kcal || 0), 0) || 0;

      const mealKcal = Number(calculateTotalNutrients([newMeal]).kcal) || 0;
      const todaysKcal = existingTodayKcal + mealKcal;
      const targetKcal = Number(userData?.calorieTarget || 0);

      await updateStreakIfThresholdMet({
        uid,
        todaysKcal,
        targetKcal,
        thresholdPct: 0.8,
      });

      clearMeal(uid);
      navigation.navigate("Home");
    } catch {
      setSaving(false);
    }
  };

  const handleCancelConfirm = () => {
    clearMeal(uid);
    navigation.navigate("Home");
  };

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
      <View style={styles.imageWrapper}>
        {checkingImage ? (
          <ActivityIndicator size="large" color={theme.accent} />
        ) : image && !imageError ? (
          <>
            <Pressable
              onPress={() => !saving && setPreviewVisible(true)}
              style={styles.imagePressable}
              disabled={saving}
            >
              <Image
                key={image}
                source={{ uri: image }}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            </Pressable>

            <Pressable
              onPress={() => !saving && goShare()}
              style={styles.shareFab}
              accessibilityRole="button"
              accessibilityLabel={t("share", { ns: "common" })}
              hitSlop={8}
              disabled={saving}
            >
              <MaterialIcons name="ios-share" size={22} color={theme.text} />
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => !saving && openCamera()}
            disabled={saving}
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

      <MealBox
        name={mealName}
        type={mealType}
        nutrition={nutrition}
        editable={!saving}
        onNameChange={setMealName}
        onTypeChange={setMealType}
      />

      <ReviewIngredientsEditor
        screenTrackingName="AddMeal"
        onContinue={() => {}}
        onStartOver={() => {
          clearMeal(uid);
          navigation.replace("MealAddMethod");
        }}
        addIngredientButtonVariant="secondary"
        hideAddIngredientWhileEditing
        wrapInLayout={false}
        showContinueButton={false}
        showStartOverButton={false}
      />

      <DateTimeSection
        value={selectedAt}
        onChange={setSelectedAt}
        addedValue={addedAt}
        onChangeAdded={setAddedAt}
      />

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

      <View style={[styles.actions, styles.actionsSpacing]}>
        <PrimaryButton
          testID="meal-result-save-button"
          label={t("save", { ns: "common" })}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
        <ErrorButton
          label={t("cancel", { ns: "common" })}
          onPress={() => setShowCancelModal(true)}
          loading={saving}
          disabled={saving}
        />
      </View>

      <Modal
        visible={showCancelModal}
        message={t("confirm_exit_message", { ns: "meals" })}
        primaryActionLabel={t("confirm", { ns: "common" })}
        onClose={() => setShowCancelModal(false)}
        onPrimaryAction={handleCancelConfirm}
        secondaryActionLabel={t("cancel", { ns: "common" })}
        onSecondaryAction={() => setShowCancelModal(false)}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    imageWrapper: {
      width: "100%",
      height: IMAGE_SIZE,
      borderRadius: theme.rounded.lg,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    image: {
      width: "100%",
      height: IMAGE_SIZE,
      borderRadius: theme.rounded.lg,
      backgroundColor: "#B2C0C9",
    },
    imagePressable: {
      width: "100%",
      height: "100%",
    },
    shareFab: {
      position: "absolute",
      right: theme.spacing.sm,
      bottom: theme.spacing.sm,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      backgroundColor: theme.background,
      borderColor: theme.border,
      shadowColor: theme.shadow,
    },
    placeholder: {
      width: "100%",
      height: IMAGE_SIZE,
      borderRadius: theme.rounded.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#B2C0C9",
      gap: theme.spacing.xs,
    },
    placeholderText: {
      fontSize: theme.typography.size.sm,
      fontWeight: "500",
      marginTop: 3,
    },
    rowCenter: { flexDirection: "row", alignItems: "center" },
    checkboxSpacing: { marginVertical: theme.spacing.md },
    checkboxLabel: { color: theme.text },
    actions: { justifyContent: "space-between" },
    actionsSpacing: { gap: theme.spacing.md, marginTop: theme.spacing.md },
  });
