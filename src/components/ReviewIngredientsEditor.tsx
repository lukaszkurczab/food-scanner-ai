import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { MaterialIcons } from "@expo/vector-icons";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import {
  Layout,
  Modal as AppModal,
  PrimaryButton,
  SecondaryButton,
  PhotoPreview,
} from "@/components";
import { IngredientBox } from "@/components/IngredientBox";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import type { Ingredient } from "@/types";

type FieldErrors = Partial<Record<keyof Ingredient, string>>;
type NavigationAction = Parameters<NavigationProp<ParamListBase>["dispatch"]>[0];

type TextOverrides = Partial<{
  startOverButtonLabel: string;
  startOverTitle: string;
  startOverMessage: string;
  startOverPrimaryLabel: string;
  startOverSecondaryLabel: string;
  exitTitle: string;
  exitMessage: string;
  exitPrimaryLabel: string;
  exitSecondaryLabel: string;
}>;

type Props = {
  screenTrackingName: string;
  onContinue: () => void;
  onOpenCamera: () => void;
  onStartOver: () => void;
  addIngredientButtonVariant?: "primary" | "secondary";
  hideAddIngredientWhileEditing?: boolean;
  disableAddIngredientWhileEditing?: boolean;
  containerPadding?: boolean;
  validateLocalImageFile?: boolean;
  enableBeforeRemoveGuard?: boolean;
  navigation?: Pick<NavigationProp<ParamListBase>, "addListener" | "dispatch">;
  continueAllowLeaveResetMs?: number;
  textOverrides?: TextOverrides;
};

const IMAGE_SIZE = 220;

export default function ReviewIngredientsEditor({
  screenTrackingName,
  onContinue,
  onOpenCamera,
  onStartOver,
  addIngredientButtonVariant = "primary",
  hideAddIngredientWhileEditing = false,
  disableAddIngredientWhileEditing = false,
  containerPadding = false,
  validateLocalImageFile = false,
  enableBeforeRemoveGuard = false,
  navigation,
  continueAllowLeaveResetMs,
  textOverrides,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const {
    meal,
    removeIngredient,
    setLastScreen,
    updateIngredient,
    saveDraft,
    addIngredient,
    setPhotoUrl,
  } = useMealDraftContext();
  const { uid } = useAuthContext();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [localDraft, setLocalDraft] = useState<Ingredient | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  const exitActionRef = useRef<NavigationAction | null>(null);
  const allowLeaveRef = useRef(false);

  const ingredients: Ingredient[] = meal?.ingredients ?? [];
  const image = meal?.photoUrl ?? null;

  useEffect(() => setImageError(false), [image]);

  useEffect(() => {
    if (uid) {
      void setLastScreen(uid, screenTrackingName);
    }
  }, [screenTrackingName, setLastScreen, uid]);

  useEffect(() => {
    if (!validateLocalImageFile) return;

    const validateLocalImage = async () => {
      if (!meal?.photoUrl) return;
      setCheckingImage(true);
      try {
        const isLocal = meal.photoUrl.startsWith("file://");
        if (!isLocal) {
          setPhotoUrl(null);
          if (uid) await saveDraft(uid);
          return;
        }
        const info = await FileSystem.getInfoAsync(meal.photoUrl);
        if (!info.exists) {
          setPhotoUrl(null);
          if (uid) await saveDraft(uid);
        }
      } finally {
        setCheckingImage(false);
      }
    };

    void validateLocalImage();
  }, [meal?.photoUrl, saveDraft, setPhotoUrl, uid, validateLocalImageFile]);

  const validate = useCallback(
    (ingredient: Ingredient): FieldErrors => {
      const errors: FieldErrors = {};
      if (!ingredient.name?.trim()) {
        errors.name = t("ingredient_name_required", { ns: "meals" });
      }
      if (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0) {
        errors.amount = t("ingredient_invalid_values", { ns: "meals" });
      }
      if ((ingredient.protein ?? 0) < 0) {
        errors.protein = t("ingredient_invalid_values", { ns: "meals" });
      }
      if ((ingredient.carbs ?? 0) < 0) {
        errors.carbs = t("ingredient_invalid_values", { ns: "meals" });
      }
      if ((ingredient.fat ?? 0) < 0) {
        errors.fat = t("ingredient_invalid_values", { ns: "meals" });
      }
      if ((ingredient.kcal ?? 0) < 0) {
        errors.kcal = t("ingredient_invalid_values", { ns: "meals" });
      }
      return errors;
    },
    [t]
  );

  const errorsByIndex = useMemo(() => {
    const map = new Map<number, FieldErrors>();
    ingredients.forEach((ingredient, idx) => map.set(idx, validate(ingredient)));
    if (localDraft) map.set(-1, validate(localDraft));
    return map;
  }, [ingredients, localDraft, validate]);

  const hasAnyErrors = useMemo(
    () => Array.from(errorsByIndex.values()).some((e) => Object.keys(e).length > 0),
    [errorsByIndex]
  );

  const isEmpty = (ingredient: Ingredient) =>
    !ingredient?.name?.trim() &&
    (ingredient?.amount ?? 0) <= 0 &&
    (ingredient?.protein ?? 0) <= 0 &&
    (ingredient?.carbs ?? 0) <= 0 &&
    (ingredient?.fat ?? 0) <= 0 &&
    (ingredient?.kcal ?? 0) <= 0;

  const persist = useCallback(async () => {
    if (uid) await saveDraft(uid);
  }, [saveDraft, uid]);

  const allowLeaving = useCallback(
    (resetAfterMs?: number) => {
      allowLeaveRef.current = true;
      if (typeof resetAfterMs === "number" && resetAfterMs > 0) {
        setTimeout(() => {
          allowLeaveRef.current = false;
        }, resetAfterMs);
      }
    },
    []
  );

  const handleOpenCamera = useCallback(() => {
    setImageMenuOpen(false);
    allowLeaving();
    onOpenCamera();
  }, [allowLeaving, onOpenCamera]);

  const handleAddIngredient = () => {
    if (editingIdx !== null || localDraft) return;
    setLocalDraft({
      id: uuidv4(),
      name: "",
      amount: 0,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    setEditingIdx(-1);
  };

  const handleRemoveIngredient = async (idx: number) => {
    if (idx === -1) {
      setLocalDraft(null);
      setEditingIdx(null);
      return;
    }
    if (editingIdx === idx) setEditingIdx(null);
    removeIngredient(idx);
    await persist();
  };

  const handleSaveIngredient = async (idx: number, updated: Ingredient) => {
    if (idx === -1) {
      if (!isEmpty(updated)) {
        addIngredient({ ...updated, id: localDraft?.id || uuidv4() });
      }
      setLocalDraft(null);
      setEditingIdx(null);
      await persist();
      return;
    }
    updateIngredient(idx, updated);
    if (editingIdx === idx) setEditingIdx(null);
    await persist();
  };

  const handlePartialChange = async (idx: number, patch: Partial<Ingredient>) => {
    if (idx === -1) {
      setLocalDraft((prev) => ({ ...(prev ?? ({} as Ingredient)), ...patch }));
      await persist();
      return;
    }
    const current = ingredients[idx];
    updateIngredient(idx, { ...current, ...patch });
    await persist();
  };

  const handleCancelEdit = (idx: number) => {
    if (idx === -1) {
      setLocalDraft(null);
      setEditingIdx(null);
      return;
    }
    setEditingIdx(null);
  };

  const handleContinue = () => {
    allowLeaving(continueAllowLeaveResetMs);
    onContinue();
  };

  const handleStartOverConfirmed = () => {
    setShowConfirmModal(false);
    allowLeaving();
    setLocalDraft(null);
    setEditingIdx(null);
    onStartOver();
  };

  const handleRemovePhoto = async () => {
    setPhotoUrl(null);
    await persist();
    setImageMenuOpen(false);
  };

  const handleTransientBack = useCallback(() => {
    if (showExitModal) {
      setShowExitModal(false);
      return true;
    }
    if (showConfirmModal) {
      setShowConfirmModal(false);
      return true;
    }
    if (imageMenuOpen) {
      setImageMenuOpen(false);
      return true;
    }
    if (previewVisible) {
      setPreviewVisible(false);
      return true;
    }
    if (editingIdx !== null) {
      handleCancelEdit(editingIdx);
      return true;
    }
    return false;
  }, [editingIdx, imageMenuOpen, previewVisible, showConfirmModal, showExitModal]);

  useEffect(() => {
    if (uid) void saveDraft(uid);
  }, [ingredients, image, saveDraft, uid]);

  useEffect(() => {
    if (!enableBeforeRemoveGuard || !navigation) return;

    const sub = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return;
      if (handleTransientBack()) {
        e.preventDefault();
        return;
      }

      const hasContent = (ingredients?.length ?? 0) > 0 || !!localDraft || !!image;
      const isEditing = editingIdx !== null;
      if (!hasContent && !isEditing) return;

      e.preventDefault();
      exitActionRef.current = e.data.action as NavigationAction;
      setShowExitModal(true);
    });
    return sub;
  }, [
    editingIdx,
    enableBeforeRemoveGuard,
    handleTransientBack,
    image,
    ingredients?.length,
    localDraft,
    navigation,
  ]);

  const handleConfirmExit = () => {
    const action = exitActionRef.current;
    setShowExitModal(false);
    if (action && navigation) {
      allowLeaving();
      navigation.dispatch(action);
    }
  };

  const labels = useMemo(
    () => ({
      startOverButtonLabel:
        textOverrides?.startOverButtonLabel ?? t("select_method", { ns: "meals" }),
      startOverTitle:
        textOverrides?.startOverTitle ?? t("confirm_exit_title", { ns: "meals" }),
      startOverMessage:
        textOverrides?.startOverMessage ?? t("confirm_exit_message", { ns: "meals" }),
      startOverPrimaryLabel:
        textOverrides?.startOverPrimaryLabel ?? t("yes", { ns: "common" }),
      startOverSecondaryLabel:
        textOverrides?.startOverSecondaryLabel ?? t("no", { ns: "common" }),
      exitTitle:
        textOverrides?.exitTitle ??
        t("confirm_exit_title", {
          ns: "meals",
          defaultValue: "Leave meal creation?",
        }),
      exitMessage:
        textOverrides?.exitMessage ??
        t("confirm_exit_message", {
          ns: "meals",
          defaultValue: "You have unsaved edits. Do you really want to leave?",
        }),
      exitPrimaryLabel:
        textOverrides?.exitPrimaryLabel ??
        t("discard", { ns: "meals", defaultValue: "Discard" }),
      exitSecondaryLabel:
        textOverrides?.exitSecondaryLabel ?? t("continue", { ns: "common" }),
    }),
    [t, textOverrides]
  );

  if (previewVisible && image) {
    return (
      <PhotoPreview
        photoUri={image}
        onRetake={() => setPreviewVisible(false)}
        onAccept={() => {
          setPreviewVisible(false);
          handleOpenCamera();
        }}
        isLoading={false}
        secondaryText={t("back", { ns: "common" })}
        primaryText={t("change_photo", { ns: "meals" })}
      />
    );
  }

  const renderAddIngredientButton =
    !hideAddIngredientWhileEditing || editingIdx === null;

  return (
    <Layout showNavigation={false}>
      <View
        style={[
          styles(theme).container,
          containerPadding ? { padding: theme.spacing.container } : null,
        ]}
      >
        <View style={styles(theme).imageWrapper}>
          {checkingImage ? (
            <ActivityIndicator size="large" color={theme.accent} />
          ) : image && !imageError ? (
            <>
              <Pressable
                onPress={() => setPreviewVisible(true)}
                style={styles(theme).imagePressable}
                disabled={editingIdx !== null}
              >
                <Image
                  key={image}
                  source={{ uri: image }}
                  style={styles(theme).image}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              </Pressable>

              {editingIdx === null && (
                <View style={styles(theme).menuButtonContainer}>
                  <Pressable
                    onPress={() => setImageMenuOpen((v) => !v)}
                    style={styles(theme).menuToggle}
                    accessibilityLabel={t("options", {
                      ns: "common",
                      defaultValue: "Options",
                    })}
                    hitSlop={10}
                  >
                    <View style={styles(theme).menuDot} />
                    <View style={styles(theme).menuDot} />
                    <View style={styles(theme).menuDot} />
                  </Pressable>

                  {imageMenuOpen && (
                    <View style={styles(theme).menuDropdown}>
                      <Pressable onPress={handleOpenCamera} style={styles(theme).menuItem}>
                        <Text style={styles(theme).menuItemText}>
                          {t("change_photo", { ns: "meals" })}
                        </Text>
                      </Pressable>
                      <Pressable onPress={handleRemovePhoto} style={styles(theme).menuItem}>
                        <Text style={styles(theme).menuItemText}>
                          {t("remove_photo", {
                            ns: "meals",
                            defaultValue: "Remove photo",
                          })}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <Pressable
              onPress={handleOpenCamera}
              disabled={editingIdx !== null}
              style={[styles(theme).placeholder, { backgroundColor: theme.card }]}
            >
              <MaterialIcons name="add-a-photo" size={44} color={theme.textSecondary} />
              <Text
                style={[styles(theme).placeholderText, { color: theme.textSecondary }]}
              >
                {t("add_photo", { ns: "meals" })}
              </Text>
            </Pressable>
          )}
        </View>

        {localDraft && (
          <IngredientBox
            key="local-draft"
            ingredient={localDraft}
            editable
            initialEdit={editingIdx === -1}
            onEditStart={() => setEditingIdx(-1)}
            onSave={(updated) => void handleSaveIngredient(-1, updated)}
            onRemove={() => void handleRemoveIngredient(-1)}
            onCancelEdit={() => handleCancelEdit(-1)}
            onChangePartial={(patch) => void handlePartialChange(-1, patch)}
            errors={errorsByIndex.get(-1)}
            hasError={Boolean(
              errorsByIndex.get(-1) && Object.keys(errorsByIndex.get(-1)!).length
            )}
          />
        )}

        {ingredients.map((ingredient, idx) => {
          const errors = errorsByIndex.get(idx);
          return (
            <IngredientBox
              key={`ing-${ingredient.id || idx}`}
              ingredient={ingredient}
              editable
              initialEdit={editingIdx === idx}
              onEditStart={() => setEditingIdx(idx)}
              onSave={(updated) => void handleSaveIngredient(idx, updated)}
              onRemove={() => void handleRemoveIngredient(idx)}
              onCancelEdit={() => handleCancelEdit(idx)}
              onChangePartial={(patch) => void handlePartialChange(idx, patch)}
              errors={errors}
              hasError={Boolean(errors && Object.keys(errors).length)}
            />
          );
        })}

        {renderAddIngredientButton &&
          (addIngredientButtonVariant === "secondary" ? (
            <SecondaryButton
              label={t("add_ingredient", { ns: "meals" })}
              onPress={handleAddIngredient}
              disabled={disableAddIngredientWhileEditing && editingIdx !== null}
              style={styles(theme).addIngredientBtn}
            />
          ) : (
            <PrimaryButton
              label={t("add_ingredient", { ns: "meals" })}
              onPress={handleAddIngredient}
              disabled={disableAddIngredientWhileEditing && editingIdx !== null}
              style={styles(theme).addIngredientBtn}
            />
          ))}

        <PrimaryButton
          label={t("continue", { ns: "common" })}
          onPress={handleContinue}
          disabled={ingredients.length === 0 || hasAnyErrors || editingIdx !== null}
          style={styles(theme).continueBtn}
        />

        <SecondaryButton
          label={labels.startOverButtonLabel}
          onPress={() => setShowConfirmModal(true)}
          style={styles(theme).startOverBtn}
        />

        <AppModal
          visible={showConfirmModal}
          title={labels.startOverTitle}
          message={labels.startOverMessage}
          primaryActionLabel={labels.startOverPrimaryLabel}
          onPrimaryAction={handleStartOverConfirmed}
          secondaryActionLabel={labels.startOverSecondaryLabel}
          onSecondaryAction={() => setShowConfirmModal(false)}
          onClose={() => setShowConfirmModal(false)}
        />

        {enableBeforeRemoveGuard && (
          <AppModal
            visible={showExitModal}
            title={labels.exitTitle}
            message={labels.exitMessage}
            primaryActionLabel={labels.exitPrimaryLabel}
            onPrimaryAction={handleConfirmExit}
            secondaryActionLabel={labels.exitSecondaryLabel}
            onSecondaryAction={() => setShowExitModal(false)}
            onClose={() => setShowExitModal(false)}
          />
        )}
      </View>
    </Layout>
  );
}

const styles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1 },
    imageWrapper: {
      marginBottom: theme.spacing.lg,
      width: "100%",
      height: IMAGE_SIZE,
      borderRadius: theme.rounded.lg,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
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
    menuButtonContainer: {
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 5,
      alignItems: "flex-end",
    },
    menuToggle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.overlay,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    menuDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.text,
      opacity: 0.9,
    },
    menuDropdown: {
      position: "absolute",
      top: 36,
      right: 0,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 6,
      minWidth: 180,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 4,
    },
    menuItem: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    menuItemText: {
      color: theme.text,
      fontWeight: "600",
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
    addIngredientBtn: {
      marginTop: 2,
      marginBottom: theme.spacing.md,
      width: "100%",
    },
    continueBtn: {
      marginTop: 2,
      marginBottom: theme.spacing.sm,
      width: "100%",
    },
    startOverBtn: { marginTop: 0, width: "100%" },
  });
