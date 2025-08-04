import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import type { Ingredient } from "@/src/types";

type IngredientBoxProps = {
  ingredient: Ingredient;
  amountEditable?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
};

export const IngredientBox: React.FC<IngredientBoxProps> = ({
  ingredient,
  onEdit,
  onRemove,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.card,
          borderRadius: theme.rounded.lg,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.row}>
        <Text
          style={[
            styles.name,
            { color: theme.text, fontFamily: theme.typography.fontFamily.bold },
          ]}
        >
          {ingredient.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={[
              styles.amount,
              {
                color: theme.textSecondary,
                fontFamily: theme.typography.fontFamily.medium,
              },
            ]}
          >
            {ingredient.amount}g
          </Text>
          {onEdit && (
            <Pressable onPress={onEdit} style={styles.icon}>
              <MaterialIcons
                name="edit"
                size={22}
                color={theme.accentSecondary}
              />
            </Pressable>
          )}
          {onRemove && (
            <Pressable onPress={onRemove} style={styles.icon}>
              <MaterialIcons name="close" size={22} color={theme.error.text} />
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.macrosRow}>
        <View
          style={[
            styles.macro,
            {
              backgroundColor: theme.macro.protein + "18",
              borderRadius: theme.rounded.sm,
            },
          ]}
        >
          <Text style={{ color: theme.macro.protein, fontWeight: "bold" }}>
            {ingredient.protein}
          </Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View
          style={[
            styles.macro,
            {
              backgroundColor: theme.macro.carbs + "18",
              borderRadius: theme.rounded.sm,
            },
          ]}
        >
          <Text style={{ color: theme.macro.carbs, fontWeight: "bold" }}>
            {ingredient.carbs}
          </Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View
          style={[
            styles.macro,
            {
              backgroundColor: theme.macro.fat + "18",
              borderRadius: theme.rounded.sm,
            },
          ]}
        >
          <Text style={{ color: theme.macro.fat, fontWeight: "bold" }}>
            {ingredient.fat}
          </Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>
      <Text
        style={[
          styles.kcal,
          {
            color: theme.textSecondary,
            fontFamily: theme.typography.fontFamily.medium,
          },
        ]}
      >
        Calories: {ingredient.kcal} kcal
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: "100%",
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 18,
    flex: 1,
    fontWeight: "bold",
  },
  amount: {
    fontSize: 16,
    marginLeft: 8,
    marginRight: 0,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 2,
    gap: 10,
  },
  macro: {
    minWidth: 62,
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  macroLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  kcal: {
    fontSize: 15,
    marginTop: 8,
    fontWeight: "500",
  },
  icon: {
    marginLeft: 6,
    marginRight: 0,
    padding: 2,
  },
});
