import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "@/src/theme/useTheme";
import { FallbackImage } from "./FallbackImage";
import { MacroChip } from "@/src/components/MacroChip";
import type { Meal } from "@/src/types/meal";

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
  const kcal = meal.ingredients.reduce((s, i) => s + i.kcal, 0);
  const p = meal.ingredients.reduce((s, i) => s + i.protein, 0);
  const c = meal.ingredients.reduce((s, i) => s + i.carbs, 0);
  const f = meal.ingredients.reduce((s, i) => s + i.fat, 0);
  return (
    <Swipeable renderRightActions={Right} overshootRight={false}>
      <Pressable
        onPress={onPress}
        style={[
          styles.row,
          { borderColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <FallbackImage
          uri={meal.photoUrl || null}
          width={48}
          height={48}
          borderRadius={12}
        />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>
            {meal.name || "Meal"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <MacroChip label="kcal" value={kcal} />
            <MacroChip label="P" value={p} />
            <MacroChip label="C" value={c} />
            <MacroChip label="F" value={f} />
          </View>
        </View>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor:
              meal.syncState === "synced"
                ? theme.accent
                : meal.syncState === "pending"
                ? theme.warning.text
                : theme.error.text,
          }}
        />
      </Pressable>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  actions: { flexDirection: "row", alignItems: "center" },
  actBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    marginLeft: 6,
    borderRadius: 10,
  },
});
