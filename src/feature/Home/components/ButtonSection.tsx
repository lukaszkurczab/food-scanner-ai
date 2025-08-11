import React from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export const ButtonSection = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Pressable
      style={[styles.button, { borderColor: theme.link }]}
      onPress={() => {
        navigation.navigate("Chat");
      }}
    >
      <MaterialIcons name="smart-toy" size={20} color={theme.link} />
      <Text style={[styles.text, { color: theme.link }]}>Ask AI for help</Text>
    </Pressable>
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
