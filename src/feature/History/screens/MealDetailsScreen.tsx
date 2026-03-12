import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Layout,
  Card,
  PrimaryButton,
  IngredientBox,
  MealBox,
  ErrorButton,
  Modal,
  ScreenCornerNavButton,
} from "@/components";
import { FallbackImage } from "../components/FallbackImage";
import { MaterialIcons } from "@expo/vector-icons";
import { useMealDetailsScreenState } from "@/feature/History/hooks/useMealDetailsScreenState";
import { MealSyncBadge } from "@/components/MealSyncBadge";

export default function MealDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const insets = useSafeAreaInsets();
  const topLeftActionStyle = useMemo(
    () => ({
      top: insets.top + theme.spacing.xs,
      left: insets.left + theme.spacing.sm,
    }),
    [insets.left, insets.top, theme.spacing.sm, theme.spacing.xs],
  );
  const contentInsetsStyle = useMemo(
    () => ({
      paddingTop: insets.top + theme.spacing.xs + 44 + theme.spacing.sm,
      paddingLeft: insets.left + 32,
      paddingRight: insets.right + 32,
    }),
    [
      insets.left,
      insets.right,
      insets.top,
      theme.spacing.sm,
      theme.spacing.xs,
    ],
  );

  const state = useMealDetailsScreenState();

  if (!state.draft || !state.nutrition) {
    return (
      <Layout showNavigation={false} style={styles.layout}>
        <ScreenCornerNavButton
          icon="back"
          onPress={state.handleBack}
          accessibilityLabel={t("back", { ns: "common", defaultValue: "Back" })}
          containerStyle={topLeftActionStyle}
        />
        <View style={[styles.emptyWrap, contentInsetsStyle]}>
          <Text style={styles.emptyTitle}>{t("detailsUnavailable.title", { ns: "meals" })}</Text>
          <Text style={styles.emptyDescription}>
            {isOnline
              ? t("detailsUnavailable.desc", { ns: "meals" })
              : t("detailsUnavailable.offlineDesc", { ns: "meals" })}
          </Text>
          <PrimaryButton
            label={t("retry", { ns: "common" })}
            onPress={() => {
              void state.reloadFromLocal();
            }}
            style={styles.emptyAction}
          />
        </View>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false} style={styles.layout}>
      <>
        <ScreenCornerNavButton
          icon="back"
          onPress={state.handleBack}
          accessibilityLabel={t("back", { ns: "common", defaultValue: "Back" })}
          containerStyle={topLeftActionStyle}
        />

        <View style={[styles.content, contentInsetsStyle]}>
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
                    ]}
                  >
                    <MaterialIcons name="ios-share" size={22} color={theme.text} />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={state.handleAddPhoto}
                  style={styles.addPhoto}
                  accessibilityRole="button"
                  accessibilityLabel={t("add_photo", { ns: "meals" })}
                >
                  <MaterialIcons
                    name="add-a-photo"
                    size={44}
                    color={theme.textSecondary}
                  />
                  <Text style={styles.addPhotoLabel}>
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
          <View style={styles.syncBadgeWrap}>
            <MealSyncBadge
              syncState={state.draft.syncState}
              lastSyncedAt={state.draft.lastSyncedAt}
            />
          </View>

          {!!state.draft.ingredients.length && (
            <Card variant="outlined" onPress={state.toggleIngredients}>
              <Text style={styles.toggleText}>
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

          <View style={styles.actionsWrap}>
            {!state.edit ? (
              <PrimaryButton
                label={t("edit_meal", { ns: "meals", defaultValue: "Edit meal" })}
                onPress={state.startEdit}
              />
            ) : (
              <View style={styles.actionsStack}>
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingTop: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    content: {},
    imageWrap: { position: "relative" },
    fab: {
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
    addPhoto: {
      width: "100%",
      height: 220,
      borderRadius: theme.rounded.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.card,
      gap: theme.spacing.xs,
    },
    addPhotoLabel: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    syncBadgeWrap: {
      marginTop: theme.spacing.sm,
      alignItems: "flex-start",
    },
    toggleText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.text,
      textAlign: "center",
    },
    actionsWrap: { marginTop: theme.spacing.lg },
    actionsStack: { gap: theme.spacing.sm },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      textAlign: "center",
      lineHeight: Math.round(theme.typography.size.sm * 1.5),
    },
    emptyAction: {
      alignSelf: "stretch",
      marginTop: theme.spacing.sm,
    },
  });
