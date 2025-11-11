import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from "react-native";
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
  Modal,
} from "@/components";
import { FallbackImage } from "../components/FallbackImage";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { Meal, MealType, Ingredient } from "@/types/meal";
import { useMeals } from "@hooks/useMeals";
import { useAuthContext } from "@/context/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
function normalizeForCompare(m: Meal) {
  const { updatedAt, localPhotoUrl, photoLocalPath, ...rest } = m as any;
  return rest;
}

export default function MealDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const params = route.params || {};
  const initialMeal: Meal | undefined = params.meal;
  const forceEdit: boolean = !!params.edit;
  const baselineFromRoute: Meal | undefined = params.baseline;

  const routeMealId =
    (initialMeal?.cloudId as string | undefined) ??
    (initialMeal?.mealId as string | undefined) ??
    null;

  const { uid } = useAuthContext();
  const { updateMeal } = useMeals(uid || "");

  const [draft, setDraft] = useState<Meal | null>(() => initialMeal ?? null);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<boolean>(() => forceEdit);
  const [editBaseline, setEditBaseline] = useState<Meal | null>(() => {
    if (baselineFromRoute) return clone(baselineFromRoute);
    if (forceEdit && initialMeal) return clone(initialMeal);
    return null;
  });
  const [showIngredients, setShowIngredients] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);

  useEffect(() => {
    if (!routeMealId) return;
    const currentId =
      (draft?.cloudId as string | undefined) ??
      (draft?.mealId as string | undefined) ??
      null;
    if (currentId !== routeMealId) {
      setDraft(initialMeal ?? null);
      if (forceEdit && initialMeal) {
        setEdit(true);
        setEditBaseline(clone(initialMeal));
      }
    }
  }, [routeMealId]);

  // odbiór URI z kamery
  useEffect(() => {
    const localFromParams: string | undefined = params.localPhotoUrl;
    if (!localFromParams) return;
    setDraft((d) =>
      d
        ? ({
            ...d,
            localPhotoUrl: localFromParams, // do natychmiastowego renderu
            photoLocalPath: localFromParams, // dla spójności z resztą warstw
            photoUrl: localFromParams, // by updateMeal wykrył lokalny URI
          } as Meal)
        : d
    );
    navigation.setParams({ ...params, localPhotoUrl: undefined });
  }, [params?.localPhotoUrl]);

  const isDirty = useMemo(() => {
    if (!edit || !editBaseline || !draft) return false;
    const a = normalizeForCompare(draft);
    const b = normalizeForCompare(editBaseline);
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [edit, draft, editBaseline]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (edit && isDirty) {
        setShowLeaveModal(true);
        return true;
      }
      navigation.replace("SavedMeals");
      return true;
    });
    return () => sub.remove();
  }, [edit, isDirty, navigation]);

  const goShare = () => {
    if (!draft) return;
    navigation.navigate("MealShare", { meal: draft, returnTo: "MealDetails" });
  };

  const handleAddPhoto = () => {
    if (!draft) return;
    navigation.navigate("SavedMealsCamera", { id: draft.mealId, meal: draft });
  };

  const effectivePhotoUri =
    draft?.localPhotoUrl || draft?.photoLocalPath || draft?.photoUrl || "";

  // sanity-check lokalnego pliku
  useEffect(() => {
    const url = effectivePhotoUri;
    if (!url) return;
    const isLocal =
      typeof url === "string" &&
      (url.startsWith("file://") || url.startsWith("content://"));
    if (!isLocal) return;
    let cancelled = false;
    setCheckingImage(true);
    FileSystem.getInfoAsync(url)
      .then((info) => {
        if (cancelled) return;
        if (!info.exists) {
          setDraft((d) =>
            d
              ? {
                  ...d,
                  localPhotoUrl: null,
                  photoLocalPath: null,
                  photoUrl: "",
                }
              : d
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingImage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectivePhotoUri]);

  if (!draft) return null;

  const nutrition = useMemo(() => calculateTotalNutrients([draft]), [draft]);

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
    const next: Meal = { ...draft, updatedAt: new Date().toISOString() };
    const { localPhotoUrl, ...toPersist } = next as any; // nie zapisuj localPhotoUrl do Firestore
    try {
      await updateMeal(toPersist as Meal);
      setEdit(false);
      setEditBaseline(null);
      setDraft(next);
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

  const confirmLeave = () => {
    setShowLeaveModal(false);
    navigation.replace("SavedMeals");
  };

  const showImageBlock =
    checkingImage || !!effectivePhotoUri || (edit && !effectivePhotoUri);

  return (
    <Layout showNavigation={false}>
      <View style={{ flex: 1, padding: theme.spacing.lg }}>
        {showImageBlock ? (
          <View style={styles.imageWrap}>
            {checkingImage ? (
              <ActivityIndicator size="large" color={theme.accent} />
            ) : effectivePhotoUri ? (
              <>
                <FallbackImage
                  uri={effectivePhotoUri}
                  width={"100%"}
                  height={220}
                  borderRadius={theme.rounded.lg}
                  onError={() =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            localPhotoUrl: null,
                            photoLocalPath: null,
                            photoUrl: "",
                          }
                        : d
                    )
                  }
                />
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
                  <MaterialIcons
                    name="ios-share"
                    size={22}
                    color={theme.text}
                  />
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleAddPhoto}
                style={[
                  {
                    width: "100%",
                    height: 220,
                    borderRadius: theme.rounded.lg,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    gap: 6,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("add_photo", { ns: "meals" })}
              >
                <MaterialIcons
                  name="add-a-photo"
                  size={44}
                  color={theme.textSecondary}
                />
                <Text style={{ color: theme.textSecondary, fontWeight: "600" }}>
                  {t("add_photo", { ns: "meals" })}
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

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

        <Modal
          visible={showLeaveModal}
          title={t("leave_without_saving_title", {
            ns: "meals",
            defaultValue: "Leave without saving?",
          })}
          message={t("leave_without_saving_message", {
            ns: "meals",
            defaultValue:
              "You have unsaved changes. Do you really want to go back and lose them?",
          })}
          primaryActionLabel={t("leave", {
            ns: "common",
            defaultValue: "Leave",
          })}
          onPrimaryAction={confirmLeave}
          secondaryActionLabel={t("continue", {
            ns: "common",
            defaultValue: "Continue editing",
          })}
          onSecondaryAction={() => setShowLeaveModal(false)}
          onClose={() => setShowLeaveModal(false)}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  imageWrap: { position: "relative" },
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
