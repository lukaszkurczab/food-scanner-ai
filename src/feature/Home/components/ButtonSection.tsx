import React from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SecondaryButton } from "@components/SecondaryButton";

export const ButtonSection = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <>
      <SecondaryButton
        label="Ask AI for help"
        onPress={() => {
          navigation.navigate("Chat");
        }}
      />
      <SecondaryButton
        label="Saved meals"
        onPress={() => {
          navigation.navigate("SavedMeals");
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  text: {
    marginLeft: 8,
    fontWeight: "500",
  },
});
