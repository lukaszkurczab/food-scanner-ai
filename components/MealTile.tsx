import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ViewStyle,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type MealTileProps = {
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUri?: string;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
};

export const MealTile: React.FC<MealTileProps> = ({
  mealName,
  calories,
  protein,
  carbs,
  fat,
  imageUri,
  onPress,
  selected,
  style,
}) => {
  const theme = useTheme();
  const macro = theme.macro || theme;

  const Content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderRadius: theme.rounded.md,
          padding: theme.spacing.md,
          borderColor: selected ? theme.accent : "transparent",
          borderWidth: selected ? 2 : 0,
          shadowColor: theme.shadow,
        },
        style,
      ]}
    >
      <View style={styles.leftSection}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.rounded.sm,
              backgroundColor: theme.background,
              opacity: selected ? 0.7 : 1,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.rounded.sm,
              backgroundColor: theme.background,
              alignItems: "center",
              justifyContent: "center",
              opacity: selected ? 0.7 : 1,
            }}
          >
            <MaterialIcons
              name="restaurant"
              size={28}
              color={theme.textSecondary}
            />
          </View>
        )}
        {selected && (
          <View style={styles.checkmark}>
            <MaterialIcons name="check-circle" size={20} color={theme.accent} />
          </View>
        )}
      </View>
      <View style={styles.rightSection}>
        <Text
          style={{
            color: theme.text,
            fontSize: theme.typography.size.base,
            fontWeight: theme.typography.weight.medium as any,
            fontFamily: theme.typography.fontFamily.medium,
            marginBottom: 2,
            maxWidth: 210,
          }}
          numberOfLines={2}
        >
          {mealName}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.regular,
            }}
          >
            {calories} kcal
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                color: macro.protein,
                fontSize: theme.typography.size.sm,
              }}
            >
              P:{protein}g
            </Text>
            <Text
              style={{ color: macro.carbs, fontSize: theme.typography.size.sm }}
            >
              C:{carbs}g
            </Text>
            <Text
              style={{ color: macro.fat, fontSize: theme.typography.size.sm }}
            >
              F:{fat}g
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${mealName}, ${calories} calories, Protein ${protein}g, Carbs ${carbs}g, Fat ${fat}g`}
      >
        {Content}
      </Pressable>
    );
  }

  return Content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  leftSection: {
    marginRight: 16,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    position: "absolute",
    top: -7,
    left: -7,
    backgroundColor: "transparent",
  },
  rightSection: {
    flex: 1,
    justifyContent: "center",
  },
});
