import React from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "@/theme/useTheme";
import { FallbackImage } from "../feature/History/components/FallbackImage";
import { MacroChip } from "@/components/MacroChip";
import type { Meal } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";

type Props = {
  meal: Meal;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelect?: () => void;
  selected?: boolean;
};

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

  const Right = (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [72, 0],
    });
    return (
      <Animated.View
        style={[styles.actionsWrap, { transform: [{ translateX }] }]}
      >
        <View
          style={[
            styles.actions,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={onDelete}
            style={[styles.actBtn, { backgroundColor: theme.error.text }]}
          >
            <Text
              style={{
                color: theme.background,
                fontSize: theme.typography.size.md,
              }}
            >
              Delete
            </Text>
          </Pressable>
          <Pressable
            onPress={onEdit}
            style={[styles.actBtn, { backgroundColor: theme.card }]}
          >
            <Text
              style={{ color: theme.text, fontSize: theme.typography.size.md }}
            >
              Edit
            </Text>
          </Pressable>
          <Pressable
            onPress={onDuplicate}
            style={[styles.actBtn, { backgroundColor: theme.accent }]}
          >
            <Text
              style={{
                color: theme.onAccent,
                fontSize: theme.typography.size.md,
              }}
            >
              Duplicate
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const nutrition = calculateTotalNutrients([meal]);

  return (
    <Swipeable
      renderRightActions={Right}
      rightThreshold={32}
      overshootRight={false}
      friction={2}
    >
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

        {meal.photoUrl && (
          <FallbackImage
            uri={meal.photoUrl || null}
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
              {meal.name || "Meal"}
            </Text>
            <Text
              style={{
                color: theme.text,
                fontFamily: theme.typography.fontFamily.bold,
                fontSize: theme.typography.size.lg,
              }}
            >
              {nutrition.kcal} kcal
            </Text>
          </View>

          <View style={styles.chipsRow}>
            <MacroChip label="Protein" value={nutrition.protein} />
            <MacroChip label="Carbs" value={nutrition.carbs} />
            <MacroChip label="Fat" value={nutrition.fat} />
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  selectBoxWrap: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
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
  chipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  actionsWrap: {
    width: 108,
    justifyContent: "center",
  },
  actions: {
    width: 108,
    padding: 8,
    borderLeftWidth: 1,
    borderRadius: 16,
    gap: 8,
    alignItems: "stretch",
  },
  actBtn: {
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
});
