import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SecondaryButton } from "@components/SecondaryButton";
import { useTranslation } from "react-i18next";
import { useTheme } from "@theme/index";

export const ButtonSection = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { t } = useTranslation("home");

  return (
    <>
      <SecondaryButton
        label={t("savedMeals")}
        onPress={() => {
          navigation.navigate("SavedMeals");
        }}
        textStyle={{
          letterSpacing: 1.2,
          fontFamily: theme.typography.fontFamily.medium,
        }}
      />
    </>
  );
};
