import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { FallbackImage } from "../feature/History/components/FallbackImage";
import { MacroChip } from "@/components/MacroChip";
import type { Meal } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import * as FileSystem from "expo-file-system";
import { getApp } from "@react-native-firebase/app";
import {
  getStorage,
  ref,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  meal: Meal;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelect?: () => void;
  selected?: boolean;
};

const app = getApp();
const st = getStorage(app);
const ACTION_WIDTH = 168;

const MealListItemBase: React.FC<Props> = ({
  meal,
  onPress,
  onEdit,
  onDelete,
  onDuplicate,
  onSelect,
  selected = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["common", "meals", "home"]);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [rowWidth, setRowWidth] = useState(0);

  const mealId = useMemo(
    () => String(meal.cloudId || meal.mealId || ""),
    [meal.cloudId, meal.mealId]
  );

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!mealId) return;
      let remoteUrl: string | null = null;
      if (meal.imageId) {
        try {
          remoteUrl = await getDownloadURL(
            ref(st, `images/${meal.imageId}.jpg`)
          );
        } catch {
          remoteUrl = null;
        }
      }
      if (!remoteUrl) {
        const url = meal.photoUrl || "";
        if (/^https?:\/\//i.test(url)) remoteUrl = url;
      }
      if (!remoteUrl) {
        try {
          const legacyRef = ref(st, `meals/${meal.userUid}/${mealId}.jpg`);
          remoteUrl = await getDownloadURL(legacyRef);
        } catch {
          remoteUrl = null;
        }
      }
      if (!remoteUrl) return;
      const dir = `${FileSystem.documentDirectory}meals/${meal.userUid}`;
      const target = `${dir}/${mealId}.jpg`;
      const info = await FileSystem.getInfoAsync(target);
      if (info.exists) {
        if (!cancelled) setLocalUri(target);
        return;
      }
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists)
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        await FileSystem.downloadAsync(remoteUrl, target);
        const ok = await FileSystem.getInfoAsync(target);
        if (ok.exists && !cancelled) setLocalUri(target);
      } catch {}
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, [mealId, meal.userUid, meal.imageId, meal.photoUrl]);

  const reveal = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const clamp = (v: number, a: number, b: number) =>
    Math.min(Math.max(v, a), b);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dy) < 8,
      onPanResponderGrant: () => {
        reveal.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(-g.dx, 0, ACTION_WIDTH);
        reveal.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const velocity = -g.vx;
        const current = clamp(-g.dx, 0, ACTION_WIDTH);
        const target =
          current > ACTION_WIDTH * 0.4 || velocity > 0.6 ? ACTION_WIDTH : 0;
        Animated.spring(reveal, {
          toValue: target,
          useNativeDriver: true,
          bounciness: 0,
          speed: 18,
        }).start(() => {
          isOpen.current = target === ACTION_WIDTH;
        });
      },
      onPanResponderTerminate: () => {
        Animated.spring(reveal, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 18,
        }).start(() => {
          isOpen.current = false;
        });
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) =>
    setRowWidth(e.nativeEvent.layout.width);

  const nutrition = calculateTotalNutrients([meal]);
  const imageUri = localUri || meal.photoUrl || null;

  const translateX = reveal.interpolate({
    inputRange: [0, ACTION_WIDTH],
    outputRange: [0, -ACTION_WIDTH],
    extrapolate: "clamp",
  });

  const handleCardPress = () => {
    if (isOpen.current) {
      Animated.spring(reveal, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start(() => {
        isOpen.current = false;
      });
      return;
    }
    onPress();
  };

  return (
    <View onLayout={onLayout} style={{ position: "relative" }}>
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}
      >
        <View
          style={[
            styles.actions,
            {
              width: ACTION_WIDTH,
              right: 0,
              position: "absolute",
              backgroundColor: theme.background,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Pressable
            onPress={onDelete}
            accessibilityLabel={t("delete", { ns: "common" })}
            hitSlop={8}
            style={[styles.actBtn, { borderColor: theme.border }]}
          >
            <MaterialIcons name="delete-outline" size={24} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={onEdit}
            accessibilityLabel={t("edit", { ns: "common" })}
            hitSlop={8}
            style={[styles.actBtn, { borderColor: theme.border }]}
          >
            <MaterialIcons name="edit" size={24} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={onDuplicate}
            accessibilityLabel={t("duplicate", { ns: "common" })}
            hitSlop={8}
            style={[styles.actBtn, { borderColor: theme.border }]}
          >
            <MaterialIcons name="content-copy" size={24} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX }], width: rowWidth || undefined }}
      >
        <Pressable
          onPress={handleCardPress}
          style={[
            styles.card,
            {
              backgroundColor: theme.background,
              borderColor: selected ? theme.accent : theme.border,
              borderWidth: selected ? 2 : 1,
              shadowColor: theme.shadow,
              shadowOpacity: selected ? 0.12 : 0.07,
            },
          ]}
        >
          {onSelect ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={onSelect}
              hitSlop={12}
              style={styles.selectBoxWrap}
            >
              <View
                style={[
                  styles.selectCircle,
                  {
                    borderColor: selected ? theme.accent : theme.border,
                    backgroundColor: selected ? theme.accent : "transparent",
                  },
                ]}
              >
                {selected ? (
                  <Text
                    style={{
                      color: theme.onAccent,
                      fontSize: 16,
                      lineHeight: 16,
                    }}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ) : null}

          {imageUri && (
            <FallbackImage
              uri={imageUri}
              width={72}
              height={72}
              borderRadius={theme.rounded.sm}
            />
          )}

          <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
            <View style={styles.headerRow}>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.text,
                  fontFamily: theme.typography.fontFamily.bold,
                  fontSize: theme.typography.size.md,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                  marginRight: 8,
                  maxWidth: "68%",
                }}
              >
                {meal.name || t("meal", { ns: "home" })}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.text,
                  fontFamily: theme.typography.fontFamily.bold,
                  fontSize: theme.typography.size.lg,
                  flexShrink: 0,
                }}
              >
                {nutrition.kcal} {t("kcal")}
              </Text>
            </View>

            <View style={styles.chipsRow}>
              <MacroChip kind="protein" value={nutrition.protein} />
              <MacroChip kind="carbs" value={nutrition.carbs} />
              <MacroChip kind="fat" value={nutrition.fat} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

function areMealsEqual(a?: Meal, b?: Meal) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    (a.cloudId || a.mealId) === (b.cloudId || b.mealId) &&
    a.updatedAt === b.updatedAt &&
    a.name === b.name &&
    (a.totals?.kcal ?? 0) === (b.totals?.kcal ?? 0) &&
    (a.totals?.protein ?? 0) === (b.totals?.protein ?? 0) &&
    (a.totals?.carbs ?? 0) === (b.totals?.carbs ?? 0) &&
    (a.totals?.fat ?? 0) === (b.totals?.fat ?? 0) &&
    (a.imageId ?? null) === (b.imageId ?? null) &&
    (a.photoUrl ?? null) === (b.photoUrl ?? null)
  );
}

function propsEqual(prev: Props, next: Props) {
  return (
    areMealsEqual(prev.meal, next.meal) &&
    prev.selected === next.selected &&
    prev.onPress === next.onPress &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.onDuplicate === next.onDuplicate &&
    prev.onSelect === next.onSelect
  );
}

export const MealListItem = React.memo(MealListItemBase, propsEqual);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  selectBoxWrap: { width: 40, alignItems: "center", justifyContent: "center" },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chipsRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  actions: {
    paddingBottom: 12,
    paddingLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    top: 0,
    bottom: 0,
  },
  actBtn: {
    width: 48,
    height: "100%",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
});
