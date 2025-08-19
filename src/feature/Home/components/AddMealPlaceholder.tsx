import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components";
import { useTranslation } from "react-i18next";

type AddMealPlaceholderProps = {
  handleAddMeal: () => void;
};

export const AddMealPlaceholder: React.FC<AddMealPlaceholderProps> = ({
  handleAddMeal,
}) => {
  const theme = useTheme();
  const { t } = useTranslation("home");

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t("noMeals")}</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t("addFirstMeal")}
      </Text>
      <PrimaryButton label={t("addMeal")} onPress={handleAddMeal} />
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
