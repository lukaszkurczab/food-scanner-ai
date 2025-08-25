import React, { useEffect, useState } from "react";
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
import {
  IngredientBox,
  type EditLifecyclePolicy,
} from "@/components/IngredientBox";
import { MaterialIcons } from "@expo/vector-icons";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import type { Ingredient } from "@/types";

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
  const [localDirty, setLocalDirty] = useState(false);

  const ingredients: Ingredient[] = meal?.ingredients ?? [];
  const image = meal?.photoUrl ?? null;

  useEffect(() => {
    if (uid) setLastScreen(uid, "ReviewIngredients");
  }, [setLastScreen, uid]);

  const policy: EditLifecyclePolicy = {
    creation: "deferred",
    leaveWhileEditing: "discard",
    removeEmptyOn: ["cancel", "leaveScreen"],
    autoSaveOnFieldBlur: false,
  };

  const isEmpty = (i: Ingredient) =>
    !i?.name?.trim() &&
    (i?.amount ?? 0) <= 0 &&
    (i?.protein ?? 0) <= 0 &&
    (i?.carbs ?? 0) <= 0 &&
    (i?.fat ?? 0) <= 0 &&
    (i?.kcal ?? 0) <= 0;

  const handleAddPhoto = () => {
    navigation.replace("MealCamera", { skipDetection: true });
  };

  const handleAddIngredient = () => {
    if (editingIdx !== null || localDraft) return;
    setLocalDraft({
      name: "",
      amount: 0,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    setEditingIdx(-1);
  };

  const handleRemoveIngredient = (idx: number) => {
    if (idx === -1) {
      setLocalDraft(null);
      setEditingIdx(null);
      setLocalDirty(false);
      return;
    }
    if (editingIdx === idx) setEditingIdx(null);
    removeIngredient(idx);
    if (uid) saveDraft(uid);
  };

  const handleSaveIngredient = (idx: number, updated: Ingredient) => {
    if (idx === -1) {
      addIngredient(updated);
      setLocalDraft(null);
      setLocalDirty(false);
      setEditingIdx(null);
      if (uid) saveDraft(uid);
      return;
    }
    updateIngredient(idx, updated);
    if (editingIdx === idx) setEditingIdx(null);
    if (uid) saveDraft(uid);
  };

  const handleCancelEdit = (idx: number) => {
    if (idx === -1) {
      if (!localDraft || isEmpty(localDraft)) {
        setLocalDraft(null);
      }
      setEditingIdx(null);
      setLocalDirty(false);
      return;
    }
    const ing = ingredients[idx];
    const empty = isEmpty(ing);
    if (empty) removeIngredient(idx);
    setEditingIdx(null);
    if (uid) saveDraft(uid);
  };

  const handleContinue = () => navigation.navigate("Result");

  const handleStartOver = () => {
    setLocalDraft(null);
    setEditingIdx(null);
    setLocalDirty(false);
    if (uid) clearMeal(uid);
    navigation.replace("MealAddMethod");
  };

  useEffect(() => {
    if (uid) saveDraft(uid);
  }, [ingredients, image, saveDraft, uid]);

  if (previewVisible && image) {
    return (
      <PhotoPreview
        photoUri={image}
        onRetake={() => setPreviewVisible(false)}
        onAccept={() => {
          setPreviewVisible(false);
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
      <View style={styles.wrapper}>
        <View style={styles.imageWrapper}>
          {image ? (
            <Pressable
              onPress={() => setPreviewVisible(true)}
              style={{ width: "100%", height: "100%" }}
            >
              <Image
                key={image}
                source={{ uri: image }}
                style={styles.image}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAddPhoto}
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

        {localDraft && (
          <IngredientBox
            key="local-draft"
            ingredient={localDraft}
            editable
            initialEdit={editingIdx === -1}
            policy={policy}
            isEmpty={isEmpty}
            signals={{
              onDirtyChange: setLocalDirty,
            }}
            onSave={(updated) => handleSaveIngredient(-1, updated)}
            onRemove={() => handleRemoveIngredient(-1)}
            onCancelEdit={() => handleCancelEdit(-1)}
          />
        )}

        {ingredients.map((ing, idx) => (
          <IngredientBox
            key={idx}
            ingredient={ing}
            editable
            initialEdit={editingIdx === idx}
            policy={policy}
            isEmpty={isEmpty}
            onSave={(updated) => handleSaveIngredient(idx, updated)}
            onRemove={() => handleRemoveIngredient(idx)}
            onCancelEdit={() => handleCancelEdit(idx)}
          />
        ))}

        <SecondaryButton
          label={t("add_ingredient", { ns: "meals" })}
          onPress={handleAddIngredient}
          disabled={editingIdx !== null}
          style={styles.addIngredientBtn}
        />
        <PrimaryButton
          label={t("continue", { ns: "common" })}
          onPress={handleContinue}
          disabled={ingredients.length === 0}
          style={styles.continueBtn}
        />
        <SecondaryButton
          label={t("start_over", { ns: "meals" })}
          onPress={() => setShowConfirmModal(true)}
          style={styles.startOverBtn}
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
      </View>
    </Layout>
  );
}

const IMAGE_SIZE = 220;

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  imageWrapper: {
    marginBottom: 22,
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    backgroundColor: "#B2C0C9",
  },
  placeholder: {
    width: "100%",
    height: IMAGE_SIZE,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#B2C0C9",
    gap: 4,
  },
  placeholderText: { fontSize: 15, fontWeight: "500", marginTop: 3 },
  addIngredientBtn: { marginTop: 2, marginBottom: 18, width: "100%" },
  continueBtn: { marginTop: 2, marginBottom: 12, width: "100%" },
  startOverBtn: { marginTop: 0, width: "100%" },
});
