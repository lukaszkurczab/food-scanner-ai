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

export const MealListItem: React.FC<Props> = ({
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
        const current = Math.max(0, Math.min(ACTION_WIDTH, -g.dx));
        const target =
          current > ACTION_WIDTH * 0.4 || velocity > 0.6 ? ACTION_WIDTH : 0;
        Animated.spring(reveal, {
          toValue: target,
          useNativeDriver: false,
          bounciness: 0,
          speed: 18,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(reveal, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 0,
          speed: 18,
        }).start();
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) =>
    setRowWidth(e.nativeEvent.layout.width);

  const nutrition = calculateTotalNutrients([meal]);
  const imageUri = localUri || meal.photoUrl || null;

  return (
    <View onLayout={onLayout} style={{ position: "relative" }}>
      <View
        pointerEvents="box-none"
        style={[
          styles.actionsWrap,
          { width: ACTION_WIDTH, right: 0, backgroundColor: "transparent" },
        ]}
      >
        <View style={[styles.actions, { backgroundColor: theme.background }]}>
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

      <Animated.View {...pan.panHandlers} style={{ marginRight: reveal }}>
        <Pressable
          onPress={onPress}
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
                  fontSize: theme.typography.size.lg,
                }}
              >
                {meal.name || t("meal", { ns: "home" })}
              </Text>
              <Text
                style={{
                  color: theme.text,
                  fontFamily: theme.typography.fontFamily.bold,
                  fontSize: theme.typography.size.lg,
                }}
              >
                {nutrition.kcal} {t("kcal")}
              </Text>
            </View>

            <View style={styles.chipsRow}>
              <MacroChip label="Protein" value={nutrition.protein} />
              <MacroChip label="Carbs" value={nutrition.carbs} />
              <MacroChip label="Fat" value={nutrition.fat} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

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
  actionsWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: "center",
  },
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
    flex: 1,
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
