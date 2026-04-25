import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView, Layout } from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useMealDetailsForm } from "@/feature/Meals/hooks/useMealDetailsForm";
import {
  formatMealTime,
  getMealDateOrNow,
} from "@/feature/Meals/hooks/useMealDetailsForm";
import MealDetailsEmptyState from "@/feature/Meals/screens/MealAdd/components/MealDetailsEmptyState";
import MealPhotoSection from "@/feature/Meals/screens/MealAdd/components/MealPhotoSection";
import MealBasicsSection from "@/feature/Meals/screens/MealAdd/components/MealBasicsSection";
import IngredientListSection from "@/feature/Meals/screens/MealAdd/components/IngredientListSection";
import MealDetailsFooter from "@/feature/Meals/screens/MealAdd/components/MealDetailsFooter";
import MealTypePickerModal from "@/feature/Meals/screens/MealAdd/components/MealTypePickerModal";
import MealTimePickerModal from "@/feature/Meals/screens/MealAdd/components/MealTimePickerModal";
import IngredientEditorModal from "@/feature/Meals/screens/MealAdd/components/IngredientEditorModal";
import type { Meal } from "@/types/meal";
import type { MealAddFlowApi } from "@/feature/Meals/feature/MapMealAddScreens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "review";

type Props = {
  flow: MealAddFlowApi;
  navigation: {
    navigate: (
      screen: "Home" | "MealAddMethod",
      params?: { selectionMode: "temporary"; origin: "mealAddFlow" },
    ) => void;
  };
  mode: Mode;
  onReviewSubmit?: (meal: Meal) => Promise<void> | void;
  reviewSubmitLabel?: string;
  reviewFallbackLabel?: string;
  onReviewFallback?: () => void;
  reviewPhotoUri?: string | null;
  reviewPhotoActionLabel?: string;
  onReviewPhotoPress?: () => void;
};

export function MealDetailsFormScreen({
  flow,
  mode,
  onReviewSubmit,
  reviewSubmitLabel,
  reviewFallbackLabel,
  onReviewFallback,
  reviewPhotoUri,
  reviewPhotoActionLabel,
  onReviewPhotoPress,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals", "common"]);
  const insets = useSafeAreaInsets();
  const footerBottomInset = Math.max(insets.bottom, theme.spacing.sm);

  const {
    uid,
    meal,
    mealTimestamp,
    mealName,
    setMealName,
    typePickerVisible,
    typeDraft,
    setTypeDraft,
    timePickerVisible,
    pickerDate,
    setPickerDate,
    editingIngredientIndex,
    ingredientDraft,
    locale,
    prefers12h,
    ingredients,
    retryLoadDraft,
    handleNameBlur,
    handleOpenTypePicker,
    handleCloseTypePicker,
    handleApplyType,
    handleOpenTimePicker,
    handleCloseTimePicker,
    handleSaveTime,
    handleOpenIngredientEditor,
    handleCloseIngredientEditor,
    handleCommitIngredient,
    handleDeleteIngredient,
    handleSubmit,
  } = useMealDetailsForm({
    mode,
    flow,
    onReviewSubmit,
  });

  const selectedAt = getMealDateOrNow(mealTimestamp);
  const mealTypeLabel = t(meal?.type ?? "other", { ns: "meals" });
  const mealTimeLabel = formatMealTime(selectedAt, locale, prefers12h);

  if (!meal || !uid) {
    return (
      <Layout showNavigation={false}>
        <MealDetailsEmptyState
          uid={uid}
          reviewFallbackLabel={reviewFallbackLabel}
          onRetry={() => {
            void retryLoadDraft();
          }}
          onSecondaryAction={() =>
            (onReviewFallback ?? flow.goBack)()
          }
        />
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                theme.spacing.xxxl + 92 + footerBottomInset,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {onReviewPhotoPress ? (
            <MealPhotoSection
              reviewPhotoUri={reviewPhotoUri}
              reviewPhotoActionLabel={reviewPhotoActionLabel}
              onPress={onReviewPhotoPress}
            />
          ) : null}

          <MealBasicsSection
            mealName={mealName}
            mealTypeLabel={mealTypeLabel}
            mealTimeLabel={mealTimeLabel}
            onMealNameChange={setMealName}
            onMealNameBlur={() => {
              void handleNameBlur();
            }}
            onOpenTypePicker={handleOpenTypePicker}
            onOpenTimePicker={handleOpenTimePicker}
          />

          <IngredientListSection
            ingredients={ingredients}
            onOpenIngredientEditor={handleOpenIngredientEditor}
          />
        </KeyboardAwareScrollView>

        <MealDetailsFooter
          reviewSubmitLabel={reviewSubmitLabel}
          footerBottomInset={footerBottomInset}
          onSubmit={() => {
            void handleSubmit();
          }}
        />
      </View>

      <MealTypePickerModal
        visible={typePickerVisible}
        typeDraft={typeDraft}
        onTypeDraftChange={setTypeDraft}
        onClose={handleCloseTypePicker}
        onApply={() => {
          void handleApplyType(typeDraft);
        }}
      />

      <MealTimePickerModal
        visible={timePickerVisible}
        prefers12h={prefers12h}
        pickerDate={pickerDate}
        onChangePickerDate={setPickerDate}
        onClose={handleCloseTimePicker}
        onApply={() => {
          void handleSaveTime();
        }}
      />

      <IngredientEditorModal
        visible={ingredientDraft !== null}
        ingredientDraft={ingredientDraft}
        editingIngredientIndex={editingIngredientIndex}
        onClose={handleCloseIngredientEditor}
        onCommit={(updated) => {
          void handleCommitIngredient(updated);
        }}
        onDelete={() => {
          void handleDeleteIngredient();
        }}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingLeft: theme.spacing.screenPaddingWide,
      paddingRight: theme.spacing.screenPaddingWide,
    },
    screen: {
      flex: 1,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
  });
