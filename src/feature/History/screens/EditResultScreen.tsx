import { useMemo } from "react";
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { DateTimeSection } from "@/components/DateTimeSection";
import {
  Layout,
  Card,
  Modal,
} from "@/components";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { MaterialIcons } from "@expo/vector-icons";
import { useEditResultState } from "@/feature/History/hooks/useEditResultState";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

type ScreenRoute = RouteProp<RootStackParamList, "EditResult">;
type EditResultNavigation = StackNavigationProp<RootStackParamList, "EditResult">;
type Props = {
  navigation: EditResultNavigation;
};

export default function EditResultScreen({ navigation }: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  if (!state.ready || !meal) return null;

  return (
    <Layout showNavigation={false}>
      <View style={styles.container}>
        <View style={styles.imageWrap}>
          {state.checkingImage ? (
            <ActivityIndicator size="large" color={theme.accent} />
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
              style={styles.placeholder}
              accessibilityRole="button"
              accessibilityLabel={t("add_photo", { ns: "meals" })}
            >
              <MaterialIcons
                name="add-a-photo"
                size={44}
                color={theme.textSecondary}
              />
              <Text style={styles.placeholderText}>
                {t("add_photo", { ns: "meals" })}
              </Text>
            </Pressable>
          )}
        </View>

        <Card>
          <Text style={styles.cardTitle}>
            {t("meal_name", { ns: "meals", defaultValue: "Nazwa posiłku" })}
          </Text>
          <Text style={styles.cardValue}>
            {state.mealName}
          </Text>
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

        <View
          style={[
            styles.actions,
            styles.actionsSpacing,
          ]}
        >
          <GlobalActionButtons
            label={t("save", { ns: "common" })}
            onPress={state.handleSave}
            primaryLoading={state.saving}
            primaryDisabled={!state.canSave}
            secondaryLabel={t("back_to_saved", {
              ns: "meals",
              defaultValue: "Wróć do zapisanych",
            })}
            secondaryOnPress={state.handleCancel}
            secondaryDisabled={state.saving}
          />
        </View>
      </View>

      <Modal
        visible={state.showCancelModal}
        message={t("cancel_edit_message", {
          ns: "meals",
          defaultValue: "Porzucić zmiany i wrócić do zapisanych posiłków?",
        })}
        primaryActionLabel={t("confirm", { ns: "common" })}
        onClose={state.closeCancelModal}
        onPrimaryAction={state.handleCancelConfirm}
        secondaryActionLabel={t("cancel", { ns: "common" })}
        onSecondaryAction={state.closeCancelModal}
      />
    </Layout>
  );
}

const IMAGE_SIZE = 220;

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { padding: theme.spacing.container },
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
      borderWidth: 2,
      gap: theme.spacing.xs,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    placeholderText: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.semiBold,
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
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      backgroundColor: theme.background,
      borderColor: theme.border,
      shadowColor: theme.shadow,
    },
    cardTitle: {
      fontSize: theme.typography.size.md,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      marginBottom: theme.spacing.sm,
    },
    cardValue: {
      color: theme.text,
      opacity: 0.8,
      marginBottom: theme.spacing.xs,
    },
    toggleText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.text,
      textAlign: "center",
    },
    actions: { justifyContent: "space-between" },
    actionsSpacing: { gap: theme.spacing.md, marginTop: theme.spacing.md },
  });
