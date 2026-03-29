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
  Button,
  GlobalActionButtons,
  MealBox,
  Checkbox,
  Layout,
  Modal,
  PhotoPreview,
} from "@/components";
import { useNetInfo } from "@react-native-community/netinfo";
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
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import ReviewIngredientsEditor from "@/components/ReviewIngredientsEditor";
import AppIcon from "@/components/AppIcon";

const IMAGE_SIZE = 220;

export default function ResultScreen({
  navigation,
  flow,
}: MealAddScreenProps<"Result">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals", "common"]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const { uid } = useAuthContext();
  const { meal, setLastScreen, clearMeal, saveDraft, loadDraft, setPhotoUrl } =
    useMealDraftContext();
  const { userData } = useUserContext();
  const { addMeal } = useMeals(uid ?? null);

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

  const retryLoadDraft = useCallback(async () => {
    if (!uid) return;
    await loadDraft(uid);
  }, [loadDraft, uid]);

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

  const nutrition = calculateTotalNutrients([meal]);

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
          <ActivityIndicator size="large" color={theme.primary} />
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
              <AppIcon name="share" size={22} color={theme.text} />
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => !saving && openCamera()}
            disabled={saving}
            style={[
              styles.placeholder,
              { backgroundColor: theme.surfaceElevated },
            ]}
          >
            <AppIcon name="add-photo" size={44} color={theme.textSecondary} />
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
          navigation.replace("MealAddMethod", {
            selectionMode: "temporary",
          });
        }}
        textOverrides={{
          startOverButtonLabel: t("change_method", { ns: "meals" }),
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
        <GlobalActionButtons
          label={t("save", { ns: "common" })}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          primaryTestID="meal-result-save-button"
          secondaryLabel={t("cancel", { ns: "common" })}
          secondaryOnPress={() => setShowCancelModal(true)}
          secondaryLoading={saving}
          secondaryDisabled={saving}
          secondaryTone="destructive"
        />
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
      fontSize: theme.typography.size.bodyS,
      fontWeight: "500",
      marginTop: 3,
    },
    rowCenter: { flexDirection: "row", alignItems: "center" },
    checkboxSpacing: {
      marginVertical: theme.spacing.md,
      marginRight: theme.spacing.sm,
    },
    checkboxLabel: { color: theme.text },
    actions: { justifyContent: "space-between" },
    actionsSpacing: { gap: theme.spacing.md, marginTop: theme.spacing.md },
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
