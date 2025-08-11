import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components";

type AddMealPlaceholderProps = {
  handleAddMeal: () => void;
};

export const AddMealPlaceholder: React.FC<AddMealPlaceholderProps> = ({
  handleAddMeal,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>No meals yet</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Add your first meal today!
      </Text>
      <PrimaryButton label="Add meal" onPress={handleAddMeal} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
});
