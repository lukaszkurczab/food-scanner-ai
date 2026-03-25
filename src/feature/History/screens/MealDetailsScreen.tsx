import { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
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
import AppIcon from "@/components/AppIcon";
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
      paddingLeft: insets.left + theme.spacing.screenPadding,
      paddingRight: insets.right + theme.spacing.screenPadding,
      paddingBottom: theme.spacing.sectionGapLarge,
    }),
    [
      insets.left,
      insets.right,
      insets.top,
      theme.spacing.screenPadding,
      theme.spacing.sectionGapLarge,
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
          <Text style={styles.emptyTitle}>
            {t("detailsUnavailable.title", { ns: "meals" })}
          </Text>
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
            <View style={styles.imageSection}>
              <View style={styles.imageWrap}>
                {state.checkingImage ? (
                  <View style={styles.imageLoaderWrap}>
                    <ActivityIndicator size="large" color={theme.primary} />
                  </View>
                ) : state.effectivePhotoUri ? (
                  <>
                    <FallbackImage
                      uri={state.effectivePhotoUri}
                      width={"100%"}
                      height={220}
                      borderRadius={theme.rounded.xl}
                      onError={state.onImageError}
                    />
                    <Pressable
                      onPress={state.goShare}
                      accessibilityRole="button"
                      accessibilityLabel={t("share", { ns: "common" })}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.fab,
                        pressed ? styles.fabPressed : null,
                      ]}
                    >
                      <AppIcon name="share" size={20} color={theme.text} />
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={state.handleAddPhoto}
                    style={({ pressed }) => [
                      styles.addPhoto,
                      pressed ? styles.addPhotoPressed : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t("add_photo", { ns: "meals" })}
                  >
                    <AppIcon
                      name="add-photo"
                      size={40}
                      color={theme.textSecondary}
                    />
                    <Text style={styles.addPhotoLabel}>
                      {t("add_photo", { ns: "meals" })}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <MealBox
              name={state.draft.name || ""}
              type={state.draft.type}
              nutrition={state.nutrition}
              addedAt={state.draft.timestamp || state.draft.createdAt}
              editable={state.edit && !state.saving}
              onNameChange={state.edit ? state.setName : undefined}
              onTypeChange={state.edit ? state.setType : undefined}
            />
          </View>

          <View style={styles.syncBadgeWrap}>
            <MealSyncBadge
              syncState={state.draft.syncState}
              lastSyncedAt={state.draft.lastSyncedAt}
            />
          </View>

          {!!state.draft.ingredients.length && (
            <View style={styles.section}>
              <Card variant="outlined" onPress={state.toggleIngredients}>
                <Text style={styles.toggleText}>
                  {state.showIngredients
                    ? t("hide_ingredients", { ns: "meals" })
                    : t("show_ingredients", { ns: "meals" })}
                </Text>
              </Card>
            </View>
          )}

          {state.showIngredients && (
            <View style={styles.ingredientsList}>
              {state.draft.ingredients.map((ingredient, idx) => (
                <View
                  key={ingredient.id || String(idx)}
                  style={styles.ingredientItem}
                >
                  <IngredientBox
                    ingredient={ingredient}
                    editable={state.edit && !state.saving}
                    onSave={(updated) =>
                      state.edit && state.updateIngredientAt(idx, updated)
                    }
                    onRemove={() => state.edit && state.removeIngredientAt(idx)}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionsWrap}>
            {!state.edit ? (
              <PrimaryButton
                label={t("edit_meal", {
                  ns: "meals",
                  defaultValue: "Edit meal",
                })}
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
          primaryAction={{
            label: t("discard", {
              ns: "common",
              defaultValue: "Discard",
            }),
            onPress: state.confirmDiscard,
            tone: "destructive",
          }}
          secondaryAction={{
            label: t("continue", {
              ns: "common",
              defaultValue: "Continue editing",
            }),
            onPress: state.closeDiscardModal,
            tone: "secondary",
          }}
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
          primaryAction={{
            label: t("leave", {
              ns: "common",
              defaultValue: "Leave",
            }),
            onPress: state.confirmLeave,
            tone: "destructive",
          }}
          secondaryAction={{
            label: t("continue", {
              ns: "common",
              defaultValue: "Continue editing",
            }),
            onPress: state.closeLeaveModal,
            tone: "secondary",
          }}
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
      backgroundColor: theme.background,
    },
    content: {
      gap: theme.spacing.sectionGap,
    },
    section: {
      gap: theme.spacing.sm,
    },
    imageSection: {
      marginBottom: theme.spacing.xs,
    },
    imageWrap: {
      position: "relative",
      borderRadius: theme.rounded.xl,
      overflow: "hidden",
      backgroundColor: theme.surfaceAlt,
    },
    imageLoaderWrap: {
      width: "100%",
      height: 220,
      borderRadius: theme.rounded.xl,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.borderSoft,
    },
    fab: {
      position: "absolute",
      right: theme.spacing.sm,
      bottom: theme.spacing.sm,
      width: 44,
      height: 44,
      borderRadius: theme.rounded.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      shadowColor: theme.text,
      shadowOpacity: theme.isDark ? 0.24 : 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    fabPressed: {
      opacity: 0.88,
    },
    addPhoto: {
      width: "100%",
      height: 220,
      borderRadius: theme.rounded.xl,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
    },
    addPhotoPressed: {
      opacity: 0.9,
    },
    addPhotoLabel: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
    },
    syncBadgeWrap: {
      marginTop: -theme.spacing.sm,
      alignItems: "flex-start",
    },
    toggleText: {
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.text,
      textAlign: "center",
    },
    ingredientsList: {
      gap: theme.spacing.sm,
    },
    ingredientItem: {
      marginBottom: 0,
    },
    actionsWrap: {
      marginTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    actionsStack: {
      gap: theme.spacing.sm,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: theme.typography.size.h2,
      lineHeight: theme.typography.lineHeight.h2,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "center",
      maxWidth: 320,
    },
    emptyAction: {
      alignSelf: "stretch",
      marginTop: theme.spacing.sm,
    },
  });
