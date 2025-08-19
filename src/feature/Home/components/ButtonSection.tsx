import React from "react";
import { useNavigation } from "@react-navigation/native";
import { SecondaryButton } from "@components/SecondaryButton";
import { useTranslation } from "react-i18next";

export const ButtonSection = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation("home");

  return (
    <>
      <SecondaryButton
        label={t("askAi")}
        onPress={() => {
          navigation.navigate("Chat");
        }}
      />
      <SecondaryButton
        label={t("savedMeals")}
        onPress={() => {
          navigation.navigate("SavedMeals");
        }}
      />
    </>
  );
};
