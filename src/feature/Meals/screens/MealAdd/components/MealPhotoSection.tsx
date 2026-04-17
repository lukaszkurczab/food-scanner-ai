import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";

type MealPhotoSectionProps = {
  reviewPhotoUri?: string | null;
  reviewPhotoActionLabel?: string;
  onPress: () => void;
};

export default function MealPhotoSection({
  reviewPhotoUri,
  reviewPhotoActionLabel,
  onPress,
}: MealPhotoSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation("meals");
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        reviewPhotoUri
          ? t("change_photo", {
              defaultValue: "Change photo",
            })
          : (reviewPhotoActionLabel ??
            t("add_photo", {
              defaultValue: "Add photo",
            }))
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.photoCard,
        pressed ? styles.selectionFieldPressed : null,
      ]}
    >
      {reviewPhotoUri ? (
        <Image source={{ uri: reviewPhotoUri }} style={styles.photoPreview} />
      ) : (
        <View style={styles.photoIconCircle}>
          <Text style={styles.photoPlus}>+</Text>
        </View>
      )}
      <View style={styles.photoCopy}>
        <Text style={styles.photoTitle}>
          {reviewPhotoUri
            ? t("change_photo", {
                defaultValue: "Change photo",
              })
            : (reviewPhotoActionLabel ??
              t("add_photo", {
                defaultValue: "Add photo",
              }))}
        </Text>
        <Text
          style={[
            styles.photoDescription,
            reviewPhotoUri ? styles.photoDescriptionMuted : null,
          ]}
        >
          {reviewPhotoUri
            ? t("review_meal_change_photo_support", {
                defaultValue: "Replace the current meal photo.",
              })
            : t("review_meal_add_photo_optional", {
                defaultValue: "Optional",
              })}
        </Text>
      </View>
      <AppIcon
        name="chevron"
        rotation="180deg"
        size={18}
        color={theme.textSecondary}
        style={styles.photoChevron}
      />
    </Pressable>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    photoCard: {
      minHeight: 78,
      borderRadius: theme.rounded.xl + 2,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.surfaceAlt,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    selectionFieldPressed: {
      opacity: 0.72,
    },
    photoPreview: {
      width: 56,
      height: 56,
      borderRadius: theme.rounded.lg + 2,
      backgroundColor: theme.borderSoft,
    },
    photoIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    photoPlus: {
      color: theme.primary,
      fontSize: 22,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.bold,
    },
    photoCopy: {
      flex: 1,
      gap: 2,
    },
    photoTitle: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
    },
    photoDescription: {
      color: theme.primary,
      fontSize: 11,
      lineHeight: 14,
      fontFamily: theme.typography.fontFamily.medium,
    },
    photoDescriptionMuted: {
      color: theme.textSecondary,
    },
    photoChevron: {
      opacity: 0.9,
    },
  });
