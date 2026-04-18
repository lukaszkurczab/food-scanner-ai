import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "@/theme/useTheme";
import type { Meal } from "@/types/meal";
import { FallbackImage } from "@/feature/History/components/FallbackImage";
import { ensureLocalMealPhoto } from "@/services/meals/mealService.images";

type MealThumbnailProps = {
  meal: Meal;
  size: number;
  borderRadius: number;
  placeholderLabel?: string;
};

export function MealThumbnail({
  meal,
  size,
  borderRadius,
  placeholderLabel,
}: MealThumbnailProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [localUri, setLocalUri] = useState<string | null>(null);

  const mealId = meal.cloudId || meal.mealId || "";

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!mealId || !meal.userUid) return;

      const directLocal =
        meal.photoLocalPath || meal.localPhotoUrl || meal.photoUrl || "";

      if (
        directLocal &&
        (directLocal.startsWith("file://") ||
          directLocal.startsWith("content://"))
      ) {
        try {
          const info = await FileSystem.getInfoAsync(directLocal);
          if (info.exists) {
            if (!cancelled) setLocalUri(directLocal);
            return;
          }
        } catch {
          // Ignore and fall back to repository resolution.
        }
      }

      const resolvedLocal = await ensureLocalMealPhoto({
        uid: meal.userUid,
        cloudId: meal.cloudId ?? null,
        imageId: meal.imageId ?? null,
        photoUrl: meal.photoUrl ?? null,
      });

      if (!cancelled) {
        setLocalUri(resolvedLocal);
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, [
    meal.cloudId,
    meal.imageId,
    meal.localPhotoUrl,
    meal.mealId,
    meal.photoLocalPath,
    meal.photoUrl,
    meal.userUid,
    mealId,
  ]);

  const imageUri =
    localUri ||
    meal.photoLocalPath ||
    meal.localPhotoUrl ||
    meal.photoUrl ||
    null;

  if (imageUri) {
    return (
      <FallbackImage
        uri={imageUri}
        width={size}
        height={size}
        borderRadius={borderRadius}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}
    >
      <Text style={styles.placeholderText}>
        {placeholderLabel ?? "No\nphoto"}
      </Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: "rgba(207, 197, 184, 0.35)",
      overflow: "hidden",
    },
    placeholderText: {
      color: "rgba(122, 127, 116, 0.78)",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: 10,
      lineHeight: 11,
      textAlign: "center",
    },
  });
