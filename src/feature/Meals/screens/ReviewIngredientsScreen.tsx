import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/useTheme";
import {
  Layout,
  Modal as AppModal,
  PrimaryButton,
  SecondaryButton,
  PhotoPreview,
} from "@/components";
import { IngredientBox } from "@/components/IngredientBox";
import { MaterialIcons } from "@expo/vector-icons";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";

type FieldErrors = Partial<Record<keyof Ingredient, string>>;

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
    addIngredient,
  } = useMealDraftContext();
  const { uid } = useAuthContext();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [localDraft, setLocalDraft] = useState<Ingredient | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const exitActionRef = useRef<any | null>(null);
  const allowLeaveRef = useRef(false);

  const ingredients: Ingredient[] = meal?.ingredients ?? [];
  const image = meal?.photoUrl ?? null;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state when image URI changes
    setImageError(false);
  }, [image]);

  useEffect(() => {
    if (uid) setLastScreen(uid, "ReviewIngredients");
  }, [setLastScreen, uid]);

  const validate = (i: Ingredient): FieldErrors => {
    const e: FieldErrors = {};
    if (!i.name?.trim())
      e.name = t("ingredient_name_required", { ns: "meals" });
    if (!Number.isFinite(i.amount) || i.amount <= 0)
      e.amount = t("ingredient_invalid_values", { ns: "meals" });
    if ((i.protein ?? 0) < 0)
      e.protein = t("ingredient_invalid_values", { ns: "meals" });
    if ((i.carbs ?? 0) < 0)
      e.carbs = t("ingredient_invalid_values", { ns: "meals" });
    if ((i.fat ?? 0) < 0)
      e.fat = t("ingredient_invalid_values", { ns: "meals" });
    if ((i.kcal ?? 0) < 0)
      e.kcal = t("ingredient_invalid_values", { ns: "meals" });
    return e;
  };

  const errorsByIndex = useMemo(() => {
    const map = new Map<number, FieldErrors>();
    ingredients.forEach((ing, idx) => map.set(idx, validate(ing)));
    if (localDraft) map.set(-1, validate(localDraft));
    return map;
  }, [ingredients, localDraft]);

  const hasAnyErrors = useMemo(
    () =>
      Array.from(errorsByIndex.values()).some((e) => Object.keys(e).length > 0),
    [errorsByIndex]
  );

  const isEmpty = (i: Ingredient) =>
    !i?.name?.trim() &&
    (i?.amount ?? 0) <= 0 &&
    (i?.protein ?? 0) <= 0 &&
    (i?.carbs ?? 0) <= 0 &&
    (i?.fat ?? 0) <= 0 &&
    (i?.kcal ?? 0) <= 0;

  const persist = async () => {
    if (uid) await saveDraft(uid);
  };

  const handleAddPhoto = () => {
    allowLeaveRef.current = true;
    navigation.replace("MealCamera", { skipDetection: true });
  };

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
      if (!isEmpty(updated))
        addIngredient({ ...updated, id: localDraft?.id || uuidv4() });
      setLocalDraft(null);
      setEditingIdx(null);
      await persist();
      return;
    }
    updateIngredient(idx, updated);
    if (editingIdx === idx) setEditingIdx(null);
    await persist();
  };

  const handlePartialChange = async (
    idx: number,
    patch: Partial<Ingredient>
  ) => {
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
    allowLeaveRef.current = true;
    navigation.navigate("Result");
    setTimeout(() => (allowLeaveRef.current = false), 500);
  };

  const handleStartOver = () => {
    allowLeaveRef.current = true;
    setLocalDraft(null);
    setEditingIdx(null);
    if (uid) clearMeal(uid);
    navigation.replace("MealAddMethod");
  };

  useEffect(() => {
    if (uid) saveDraft(uid);
  }, [ingredients, image, saveDraft, uid]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e: any) => {
      if (allowLeaveRef.current) return;
      const hasContent =
        (ingredients?.length ?? 0) > 0 || !!localDraft || !!image;
      const isEditing = editingIdx !== null;
      if (!hasContent && !isEditing) return;
      e.preventDefault();
      exitActionRef.current = e.data.action;
      setShowExitModal(true);
    });
    return sub;
  }, [navigation, ingredients?.length, localDraft, image, editingIdx]);

  const confirmExit = () => {
    const action = exitActionRef.current;
    setShowExitModal(false);
    if (action) {
      allowLeaveRef.current = true;
      navigation.dispatch(action);
    }
  };

  if (previewVisible && image) {
    return (
      <PhotoPreview
        photoUri={image}
        onRetake={() => setPreviewVisible(false)}
        onAccept={() => {
          setPreviewVisible(false);
          // Allow navigation without exit-confirm when changing photo
          allowLeaveRef.current = true;
          navigation.replace("MealCamera", { skipDetection: true });
        }}
        isLoading={false}
        secondaryText={t("back", { ns: "common" })}
        primaryText={t("change_photo", { ns: "meals" })}
      />
    );
  }

  return (
    <Layout showNavigation={false}>
      <View style={styles(theme).container}>
        <View style={styles(theme).imageWrapper}>
          {image && !imageError ? (
            <Pressable
              onPress={() => setPreviewVisible(true)}
              style={{ width: "100%", height: "100%" }}
              disabled={editingIdx != null}
            >
              <Image
                key={image}
                source={{ uri: image }}
                style={styles(theme).image}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAddPhoto}
              disabled={editingIdx != null}
              style={[
                styles(theme).placeholder,
                { backgroundColor: theme.card },
              ]}
            >
              <MaterialIcons
                name="add-a-photo"
                size={44}
                color={theme.textSecondary}
              />
              <Text
                style={[
                  styles(theme).placeholderText,
                  { color: theme.textSecondary },
                ]}
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
            onSave={(updated) => handleSaveIngredient(-1, updated)}
            onRemove={() => handleRemoveIngredient(-1)}
            onCancelEdit={() => handleCancelEdit(-1)}
            onChangePartial={(patch) => handlePartialChange(-1, patch)}
            errors={errorsByIndex.get(-1)}
            hasError={Boolean(
              errorsByIndex.get(-1) &&
                Object.keys(errorsByIndex.get(-1)!).length
            )}
          />
        )}

        {ingredients.map((ing, idx) => {
          const e = errorsByIndex.get(idx);
          return (
            <IngredientBox
              key={`ing-${(ing as any)?.id || idx}`}
              ingredient={ing}
              editable
              initialEdit={editingIdx === idx}
              onEditStart={() => setEditingIdx(idx)}
              onSave={(updated) => handleSaveIngredient(idx, updated)}
              onRemove={() => handleRemoveIngredient(idx)}
              onCancelEdit={() => handleCancelEdit(idx)}
              onChangePartial={(patch) => handlePartialChange(idx, patch)}
              errors={e}
              hasError={Boolean(e && Object.keys(e).length)}
            />
          );
        })}

        <SecondaryButton
          label={t("add_ingredient", { ns: "meals" })}
          onPress={handleAddIngredient}
          disabled={editingIdx !== null}
          style={styles(theme).addIngredientBtn}
        />
        <PrimaryButton
          label={t("continue", { ns: "common" })}
          onPress={handleContinue}
          disabled={
            ingredients.length === 0 || hasAnyErrors || editingIdx !== null
          }
          style={styles(theme).continueBtn}
        />
        <SecondaryButton
          label={t("start_over", { ns: "meals" })}
          onPress={() => setShowConfirmModal(true)}
          style={styles(theme).startOverBtn}
        />

        <AppModal
          visible={showConfirmModal}
          title={t("start_over_title", { ns: "meals" })}
          message={t("start_over_message", { ns: "meals" })}
          primaryActionLabel={t("quit", { ns: "common" })}
          onPrimaryAction={handleStartOver}
          secondaryActionLabel={t("continue", { ns: "common" })}
          onSecondaryAction={() => setShowConfirmModal(false)}
          onClose={() => setShowConfirmModal(false)}
        />

        <AppModal
          visible={showExitModal}
          title={t("confirm_exit_title", {
            ns: "meals",
            defaultValue: "Leave meal creation?",
          })}
          message={t("confirm_exit_message", {
            ns: "meals",
            defaultValue:
              "You have unsaved edits. Do you really want to leave?",
          })}
          primaryActionLabel={t("quit", { ns: "common" })}
          onPrimaryAction={confirmExit}
          secondaryActionLabel={t("continue", { ns: "common" })}
          onSecondaryAction={() => setShowExitModal(false)}
          onClose={() => setShowExitModal(false)}
        />
      </View>
    </Layout>
  );
}

const IMAGE_SIZE = 220;

const styles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, padding: theme.spacing.container },
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
