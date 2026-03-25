import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { DateTimeSection } from "@/components/DateTimeSection";
import {
  Layout,
  Card,
  Modal,
  PrimaryButton,
  SecondaryButton,
} from "@/components";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import AppIcon from "@/components/AppIcon";
import { useEditResultState } from "@/feature/History/hooks/useEditResultState";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

type ScreenRoute = RouteProp<RootStackParamList, "EditResult">;
type EditResultNavigation = StackNavigationProp<
  RootStackParamList,
  "EditResult"
>;

type Props = {
  navigation: EditResultNavigation;
};

const IMAGE_SIZE = 220;

export default function EditResultScreen({ navigation }: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const { uid } = useAuthContext();
  const route = useRoute<ScreenRoute>();
  const savedCloudId = route.params?.savedCloudId;
  const { meal, setLastScreen, setPhotoUrl } = useMealDraftContext();

  const state = useEditResultState({
    uid,
    meal,
    savedCloudId,
    setLastScreen,
    setPhotoUrl,
    navigation,
  });

  if (!state.meal) {
    return (
      <Layout showNavigation={false}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {t("editUnavailable.title", { ns: "meals" })}
          </Text>
          <Text style={styles.emptyDescription}>
            {isOnline
              ? t("editUnavailable.desc", { ns: "meals" })
              : t("editUnavailable.offlineDesc", { ns: "meals" })}
          </Text>
          <PrimaryButton
            label={t("retry", { ns: "common" })}
            onPress={() => {
              void state.reloadFromLocal();
            }}
            style={styles.emptyAction}
          />
          <SecondaryButton
            label={t("back_to_saved", { ns: "meals" })}
            onPress={state.handleCancelConfirm}
            style={styles.emptyAction}
          />
        </View>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false}>
      <View style={styles.container}>
        <View style={styles.imageWrap}>
          {state.checkingImage ? (
            <ActivityIndicator
              size="large"
              color={theme.cta.primaryBackground}
            />
          ) : state.image && !state.imageError ? (
            <>
              <Image
                source={{ uri: state.image }}
                style={styles.image}
                resizeMode="cover"
                onError={state.onImageError}
              />
              <Pressable
                onPress={state.goShare}
                accessibilityRole="button"
                accessibilityLabel={t("share", { ns: "common" })}
                hitSlop={8}
                style={styles.fab}
              >
                <AppIcon name="share" size={22} color={theme.text} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={state.handleAddPhoto}
              style={styles.placeholder}
              accessibilityRole="button"
              accessibilityLabel={t("add_photo", { ns: "meals" })}
            >
              <AppIcon name="add-photo" size={44} color={theme.textSecondary} />
              <Text style={styles.placeholderText}>
                {t("add_photo", { ns: "meals" })}
              </Text>
            </Pressable>
          )}
        </View>

        <Card>
          <Text style={styles.cardTitle}>
            {t("meal_name", {
              ns: "meals",
              defaultValue: "Nazwa posiłku",
            })}
          </Text>
          <Text style={styles.cardValue}>{state.mealName}</Text>
        </Card>

        <DateTimeSection
          value={state.selectedAt}
          onChange={state.setSelectedAt}
          addedValue={state.addedAt}
          onChangeAdded={state.setAddedAt}
        />

        <Card variant="outlined" onPress={state.toggleIngredients}>
          <Text style={styles.toggleText}>
            {state.showIngredients
              ? t("hide_ingredients", { ns: "meals" })
              : t("show_ingredients", { ns: "meals" })}
          </Text>
        </Card>

        <View style={[styles.actions, styles.actionsSpacing]}>
          <GlobalActionButtons
            label={t("save", { ns: "common" })}
            onPress={state.handleSave}
            loading={state.saving}
            disabled={!state.canSave}
            tone="primary"
            secondaryLabel={t("back_to_saved", {
              ns: "meals",
              defaultValue: "Wróć do zapisanych",
            })}
            secondaryOnPress={state.handleCancel}
            secondaryDisabled={state.saving}
            secondaryTone="secondary"
          />
        </View>
      </View>

      <Modal
        visible={state.showCancelModal}
        title={t("cancel_edit_title", {
          ns: "meals",
          defaultValue: "Discard changes?",
        })}
        message={t("cancel_edit_message", {
          ns: "meals",
          defaultValue: "Porzucić zmiany i wrócić do zapisanych posiłków?",
        })}
        primaryAction={{
          label: t("confirm", { ns: "common" }),
          onPress: state.handleCancelConfirm,
          tone: "primary",
        }}
        secondaryAction={{
          label: t("cancel", { ns: "common" }),
          onPress: state.closeCancelModal,
          tone: "secondary",
        }}
        onClose={state.closeCancelModal}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.screenPadding,
    },
    imageWrap: {
      position: "relative",
      width: "100%",
      height: IMAGE_SIZE,
      borderRadius: theme.rounded.lg,
      overflow: "hidden",
      marginBottom: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    image: {
      width: "100%",
      height: IMAGE_SIZE,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.border,
    },
    placeholder: {
      width: "100%",
      height: IMAGE_SIZE,
      borderRadius: theme.rounded.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      gap: theme.spacing.xs,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    placeholderText: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      marginTop: theme.spacing.xs,
    },
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
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    cardTitle: {
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      marginBottom: theme.spacing.sm,
    },
    cardValue: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      marginBottom: theme.spacing.xs,
    },
    toggleText: {
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.text,
      textAlign: "center",
    },
    actions: {
      justifyContent: "space-between",
    },
    actionsSpacing: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: theme.spacing.screenPadding,
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
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      textAlign: "center",
    },
    emptyAction: {
      alignSelf: "stretch",
    },
  });
