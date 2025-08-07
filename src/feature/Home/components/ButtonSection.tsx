import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

export const ButtonSection = () => {
  const theme = useTheme();

  return (
    <Pressable style={[styles.button, { borderColor: theme.link }]}
      onPress={() => {/* navigate to AI */}}
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