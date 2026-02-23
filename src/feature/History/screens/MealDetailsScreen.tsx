import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
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
import { MaterialIcons } from "@expo/vector-icons";
import { useMealDetailsScreenState } from "@/feature/History/hooks/useMealDetailsScreenState";

export default function MealDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);

  const state = useMealDetailsScreenState();

  if (!state.draft || !state.nutrition) return null;

  return (
    <Layout showNavigation={false}>
      <>
        {state.showImageBlock ? (
          <View style={styles.imageWrap}>
            {state.checkingImage ? (
              <ActivityIndicator size="large" color={theme.accent} />
            ) : state.effectivePhotoUri ? (
              <>
                <FallbackImage
                  uri={state.effectivePhotoUri}
                  width={"100%"}
                  height={220}
                  borderRadius={theme.rounded.lg}
                  onError={state.onImageError}
                />
                <Pressable
                  onPress={state.goShare}
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
              </>
            ) : (
              <Pressable
                onPress={state.handleAddPhoto}
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
          name={state.draft.name || ""}
          type={state.draft.type}
          nutrition={state.nutrition}
          addedAt={state.draft.timestamp || state.draft.createdAt}
          editable={state.edit && !state.saving}
          onNameChange={state.edit ? state.setName : undefined}
          onTypeChange={state.edit ? state.setType : undefined}
        />

        {!!state.draft.ingredients.length && (
          <Card variant="outlined" onPress={state.toggleIngredients}>
            <Text
              style={{
                fontSize: theme.typography.size.md,
                fontWeight: "500",
                color: theme.text,
                textAlign: "center",
              }}
            >
              {state.showIngredients
                ? t("hide_ingredients", { ns: "meals" })
                : t("show_ingredients", { ns: "meals" })}
            </Text>
          </Card>
        )}

        {state.showIngredients &&
          state.draft.ingredients.map((ingredient, idx) => (
            <IngredientBox
              key={ingredient.id || String(idx)}
              ingredient={ingredient}
              editable={state.edit && !state.saving}
              onSave={(updated) => state.edit && state.updateIngredientAt(idx, updated)}
              onRemove={() => state.edit && state.removeIngredientAt(idx)}
            />
          ))}

        <View style={{ marginTop: theme.spacing.lg }}>
          {!state.edit ? (
            <PrimaryButton
              label={t("edit_meal", { ns: "meals", defaultValue: "Edit meal" })}
              onPress={state.startEdit}
            />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              <PrimaryButton
                label={t("save_changes", { ns: "common" })}
                onPress={state.handleSave}
                loading={state.saving}
                disabled={state.saving || !state.isDirty}
              />
              <ErrorButton
                label={t("cancel", { ns: "common" })}
                onPress={state.handleCancel}
                disabled={state.saving}
              />
            </View>
          )}
        </View>

        <Modal
          visible={state.showDiscardModal}
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
          onPrimaryAction={state.confirmDiscard}
          secondaryActionLabel={t("continue", {
            ns: "common",
            defaultValue: "Continue editing",
          })}
          onSecondaryAction={state.closeDiscardModal}
          onClose={state.closeDiscardModal}
        />

        <Modal
          visible={state.showLeaveModal}
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
          onPrimaryAction={state.confirmLeave}
          secondaryActionLabel={t("continue", {
            ns: "common",
            defaultValue: "Continue editing",
          })}
          onSecondaryAction={state.closeLeaveModal}
          onClose={state.closeLeaveModal}
        />
      </>
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
