import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  Layout,
  Card,
  PrimaryButton,
  IngredientBox,
  MealBox,
  ErrorButton,
} from "@/components";
import { FallbackImage } from "../components/FallbackImage";
import { Modal } from "@/components/Modal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { Meal, MealType, Ingredient } from "@/types/meal";
import { useMeals } from "@hooks/useMeals";
import { useAuthContext } from "@/context/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export default function MealDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const route = useRoute<any>();
  const initial: Meal | undefined = route.params?.meal;

  const { uid } = useAuthContext();
  const { updateMeal } = useMeals(uid || "");
  const nav = useNavigation<any>();

  const [draft, setDraft] = useState<Meal | null>(initial ?? null);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [editBaseline, setEditBaseline] = useState<Meal | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const goShare = () => {
    if (!draft) return;
    nav.navigate("MealShare", { meal: draft, returnTo: "MealDetails" });
  };

  useEffect(() => {
    if (initial) setDraft(initial);
  }, [initial]);

  if (!draft) return null;

  const nutrition = useMemo(() => calculateTotalNutrients([draft]), [draft]);

  const isDirty = useMemo(() => {
    if (!edit || !editBaseline) return false;
    return JSON.stringify(draft) !== JSON.stringify(editBaseline);
  }, [edit, draft, editBaseline]);

  const setName = (val: string) =>
    setDraft((d) => (d ? { ...d, name: val } : d));
  const setType = (val: MealType) =>
    setDraft((d) => (d ? { ...d, type: val } : d));

  const updateIngredientAt = (index: number, ing: Ingredient) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            ingredients: d.ingredients.map((it, i) => (i === index ? ing : it)),
            updatedAt: new Date().toISOString(),
          }
        : d
    );

  const removeIngredientAt = (index: number) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            ingredients: d.ingredients.filter((_, i) => i !== index),
            updatedAt: new Date().toISOString(),
          }
        : d
    );

  const startEdit = () => {
    setEditBaseline(clone(draft));
    setEdit(true);
  };

  const handleSave = async () => {
    if (!draft || saving) return;
    setSaving(true);
    const toSave: Meal = { ...draft, updatedAt: new Date().toISOString() };
    try {
      await updateMeal(toSave);
      setEdit(false);
      setEditBaseline(null);
      setDraft(toSave);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (edit && isDirty) {
      setShowDiscardModal(true);
      return;
    }
    if (editBaseline) setDraft(editBaseline);
    setEdit(false);
    setEditBaseline(null);
  };

  const confirmDiscard = () => {
    if (editBaseline) setDraft(editBaseline);
    setShowDiscardModal(false);
    setEdit(false);
    setEditBaseline(null);
  };

  return (
    <Layout showNavigation={false}>
      <View style={{ flex: 1, padding: theme.spacing.lg }}>
        <View style={styles.imageWrap}>
          <FallbackImage
            uri={draft.photoUrl || null}
            width={"100%"}
            height={220}
            borderRadius={theme.rounded.lg}
          />
          {draft.photoUrl && draft.photoUrl != "" ? (
            <Pressable
              onPress={goShare}
              accessibilityRole="button"
              accessibilityLabel={t("share", { ns: "common" })}
              hitSlop={8}
              style={[
                styles.fab,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <MaterialIcons name="ios-share" size={22} color={theme.text} />
            </Pressable>
          ) : null}
        </View>

        <MealBox
          name={draft.name || ""}
          type={draft.type}
          nutrition={nutrition}
          addedAt={draft.timestamp || draft.createdAt}
          editable={edit && !saving}
          onNameChange={edit ? setName : undefined}
          onTypeChange={edit ? setType : undefined}
        />

        {!!draft.ingredients.length && (
          <Card
            variant="outlined"
            onPress={() => !saving && setShowIngredients((v) => !v)}
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
        )}

        {showIngredients &&
          draft.ingredients.map((ingredient, idx) => (
            <IngredientBox
              key={`${(ingredient as any)?.id || idx}`}
              ingredient={ingredient}
              editable={edit && !saving}
              onSave={(updated) => edit && updateIngredientAt(idx, updated)}
              onRemove={() => edit && removeIngredientAt(idx)}
            />
          ))}

        <View style={{ marginTop: theme.spacing.lg }}>
          {!edit ? (
            <PrimaryButton
              label={t("edit_meal", { ns: "meals", defaultValue: "Edit meal" })}
              onPress={startEdit}
            />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              <PrimaryButton
                label={t("save_changes", { ns: "common" })}
                onPress={handleSave}
                loading={saving}
                disabled={saving || !isDirty}
              />
              <ErrorButton
                label={t("cancel", { ns: "common" })}
                onPress={handleCancel}
                disabled={saving}
              />
            </View>
          )}
        </View>

        <Modal
          visible={showDiscardModal}
          title={t("discard_changes_title", {
            ns: "meals",
            defaultValue: "Discard changes?",
          })}
          message={t("discard_changes_message", {
            ns: "meals",
            defaultValue:
              "You have unsaved edits. Do you really want to cancel and lose your changes?",
          })}
          primaryActionLabel={t("discard", {
            ns: "common",
            defaultValue: "Discard",
          })}
          onPrimaryAction={confirmDiscard}
          secondaryActionLabel={t("continue", {
            ns: "common",
            defaultValue: "Continue editing",
          })}
          onSecondaryAction={() => setShowDiscardModal(false)}
          onClose={() => setShowDiscardModal(false)}
        />
        <Text>Draft: {draft.photoUrl}</Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    position: "relative",
  },
  fab: {
    position: "absolute",
    right: 12,
    bottom: 12,
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
  },
});
