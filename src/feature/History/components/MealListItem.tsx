import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "@/theme/useTheme";
import { FallbackImage } from "./FallbackImage";
import { MacroChip } from "@/components/MacroChip";
import type { Meal } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";

type Props = {
  meal: Meal;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

export const MealListItem: React.FC<Props> = ({
  meal,
  onPress,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const theme = useTheme();

  const Right = () => (
    <View style={styles.actions}>
      <Pressable
        onPress={onEdit}
        style={[styles.actBtn, { backgroundColor: theme.card }]}
      >
        <Text style={{ color: theme.text }}>Edit</Text>
      </Pressable>
      <Pressable
        onPress={onDuplicate}
        style={[styles.actBtn, { backgroundColor: theme.accent }]}
      >
        <Text style={{ color: theme.onAccent }}>Duplicate</Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        style={[styles.actBtn, { backgroundColor: theme.error.text }]}
      >
        <Text style={{ color: theme.background }}>Delete</Text>
      </Pressable>
    </View>
  );

  const nutrition = calculateTotalNutrients([meal]);

  return (
    <Swipeable renderRightActions={Right} overshootRight={false}>
      <Pressable
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
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
    borderWidth: 1,
    marginBottom: 12,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
  actions: { flexDirection: "row", alignItems: "center" },
  actBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    marginLeft: 6,
    borderRadius: 12,
  },
});
