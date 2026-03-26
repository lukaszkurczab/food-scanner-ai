import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import {
  Button,
  Layout,
  Modal as AppModal,
} from "@/components";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
import { IngredientBox } from "@/components/IngredientBox";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import type { Ingredient } from "@/types";

type FieldErrors = Partial<Record<keyof Ingredient, string>>;
type NavigationAction = Parameters<
  NavigationProp<ParamListBase>["dispatch"]
>[0];

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
  onStartOver: () => void;
  addIngredientButtonVariant?: "primary" | "secondary";
  hideAddIngredientWhileEditing?: boolean;
  disableAddIngredientWhileEditing?: boolean;
  containerPadding?: boolean;
  enableBeforeRemoveGuard?: boolean;
  navigation?: Pick<NavigationProp<ParamListBase>, "addListener" | "dispatch">;
  continueAllowLeaveResetMs?: number;
  textOverrides?: TextOverrides;
  wrapInLayout?: boolean;
  showContinueButton?: boolean;
  showStartOverButton?: boolean;
};

export default function ReviewIngredientsEditor({
  screenTrackingName,
  onContinue,
  onStartOver,
  addIngredientButtonVariant = "primary",
  hideAddIngredientWhileEditing = false,
  disableAddIngredientWhileEditing = false,
  containerPadding = false,
  enableBeforeRemoveGuard = false,
  navigation,
  continueAllowLeaveResetMs,
  textOverrides,
  wrapInLayout = true,
  showContinueButton = true,
  showStartOverButton = true,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals", "common"]);
  const {
    meal,
    removeIngredient,
    setLastScreen,
    updateIngredient,
    saveDraft,
    addIngredient,
  } = useMealDraftContext();
  const { uid } = useAuthContext();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [localDraft, setLocalDraft] = useState<Ingredient | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const exitActionRef = useRef<NavigationAction | null>(null);
  const allowLeaveRef = useRef(false);

  const ingredients: Ingredient[] = useMemo(
    () => meal?.ingredients ?? [],
    [meal?.ingredients],
  );

  useEffect(() => {
    if (uid) {
      void setLastScreen(uid, screenTrackingName);
    }
  }, [screenTrackingName, setLastScreen, uid]);

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
    [t],
  );

  const errorsByIndex = useMemo(() => {
    const map = new Map<number, FieldErrors>();
    ingredients.forEach((ingredient, idx) =>
      map.set(idx, validate(ingredient)),
    );
    if (localDraft) map.set(-1, validate(localDraft));
    return map;
  }, [ingredients, localDraft, validate]);

  const hasAnyErrors = useMemo(
    () =>
      Array.from(errorsByIndex.values()).some((e) => Object.keys(e).length > 0),
    [errorsByIndex],
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

  const allowLeaving = useCallback((resetAfterMs?: number) => {
    allowLeaveRef.current = true;
    if (typeof resetAfterMs === "number" && resetAfterMs > 0) {
      setTimeout(() => {
        allowLeaveRef.current = false;
      }, resetAfterMs);
    }
  }, []);

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

  const handlePartialChange = async (
    idx: number,
    patch: Partial<Ingredient>,
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

  const handleTransientBack = useCallback(() => {
    if (showExitModal) {
      setShowExitModal(false);
      return true;
    }
    if (showConfirmModal) {
      setShowConfirmModal(false);
      return true;
    }
    if (editingIdx !== null) {
      handleCancelEdit(editingIdx);
      return true;
    }
    return false;
  }, [editingIdx, showConfirmModal, showExitModal]);

  useEffect(() => {
    if (uid) void saveDraft(uid);
  }, [ingredients, saveDraft, uid]);

  useEffect(() => {
    if (!enableBeforeRemoveGuard || !navigation) return;

    const sub = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return;

      if (handleTransientBack()) {
        e.preventDefault();
        return;
      }

      const hasContent = (ingredients?.length ?? 0) > 0 || !!localDraft;
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
        textOverrides?.startOverButtonLabel ??
        t("select_method", { ns: "meals" }),
      startOverTitle:
        textOverrides?.startOverTitle ??
        t("confirm_exit_title", { ns: "meals" }),
      startOverMessage:
        textOverrides?.startOverMessage ??
        t("confirm_exit_message", { ns: "meals" }),
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
        textOverrides?.exitSecondaryLabel ??
        t("continue_editing", { ns: "meals", defaultValue: "Continue editing" }),
    }),
    [t, textOverrides],
  );

  const renderAddIngredientButton =
    !hideAddIngredientWhileEditing || editingIdx === null;

  const content = (
    <View
      style={[
        styles.container,
        containerPadding ? styles.containerPadded : null,
      ]}
    >
      {localDraft ? (
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
            errorsByIndex.get(-1) && Object.keys(errorsByIndex.get(-1)!).length,
          )}
        />
      ) : null}

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

      {renderAddIngredientButton ? (
        addIngredientButtonVariant === "secondary" ? (
          <Button
            variant="secondary"
            testID="meal-add-add-ingredient-button"
            label={t("add_ingredient", { ns: "meals" })}
            onPress={handleAddIngredient}
            disabled={disableAddIngredientWhileEditing && editingIdx !== null}
            style={styles.addIngredientBtn}
          />
        ) : (
          <Button
            testID="meal-add-add-ingredient-button"
            label={t("add_ingredient", { ns: "meals" })}
            onPress={handleAddIngredient}
            disabled={disableAddIngredientWhileEditing && editingIdx !== null}
            style={styles.addIngredientBtn}
          />
        )
      ) : null}

      {showContinueButton && showStartOverButton ? (
        <GlobalActionButtons
          label={t("continue", { ns: "common" })}
          onPress={handleContinue}
          disabled={
            ingredients.length === 0 || hasAnyErrors || editingIdx !== null
          }
          testID="meal-add-continue-button"
          primaryStyle={styles.continueBtn}
          secondaryLabel={labels.startOverButtonLabel}
          secondaryOnPress={() => setShowConfirmModal(true)}
          secondaryStyle={styles.startOverBtn}
          layout="column"
        />
      ) : null}

      {showContinueButton && !showStartOverButton ? (
        <Button
          testID="meal-add-continue-button"
          label={t("continue", { ns: "common" })}
          onPress={handleContinue}
          disabled={
            ingredients.length === 0 || hasAnyErrors || editingIdx !== null
          }
          style={styles.continueBtn}
        />
      ) : null}

      {!showContinueButton && showStartOverButton ? (
        <Button
          variant="secondary"
          label={labels.startOverButtonLabel}
          onPress={() => setShowConfirmModal(true)}
          style={styles.startOverBtn}
        />
      ) : null}

      <AppModal
        visible={showConfirmModal}
        title={labels.startOverTitle}
        message={labels.startOverMessage}
        primaryAction={{
          label: labels.startOverPrimaryLabel,
          onPress: handleStartOverConfirmed,
          tone: "primary",
        }}
        secondaryAction={{
          label: labels.startOverSecondaryLabel,
          onPress: () => setShowConfirmModal(false),
          tone: "secondary",
        }}
        onClose={() => setShowConfirmModal(false)}
      />

      {enableBeforeRemoveGuard ? (
        <AppModal
          visible={showExitModal}
          title={labels.exitTitle}
          message={labels.exitMessage}
          primaryAction={{
            label: labels.exitPrimaryLabel,
            onPress: handleConfirmExit,
            tone: "destructive",
          }}
          secondaryAction={{
            label: labels.exitSecondaryLabel,
            onPress: () => setShowExitModal(false),
            tone: "secondary",
          }}
          onClose={() => setShowExitModal(false)}
        />
      ) : null}
    </View>
  );

  if (!wrapInLayout) {
    return content;
  }

  return <Layout showNavigation={false}>{content}</Layout>;
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    containerPadded: {
      padding: theme.spacing.screenPadding,
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
    startOverBtn: {
      marginTop: 0,
      width: "100%",
    },
  });
