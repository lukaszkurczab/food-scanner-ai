import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

export const AddMealPlaceholder = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>No meals yet</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Start by adding your first one!</Text>
      <Pressable style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={() => {/* navigate to add meal */}}
      >
        <Text style={[styles.buttonText, { color: theme.onAccent }]}>Add meal</Text>
      </Pressable>
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
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: "bold",
  },
});