import { View, TextInput, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useState } from "react";

type Props = {
  onFilterChange: (filters: { query: string }) => void;
};

export const MealFilterBar = ({ onFilterChange }: Props) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [query, setQuery] = useState("");

  const handleQueryChange = (text: string) => {
    setQuery(text);
    onFilterChange({ query: text });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search meals..."
        placeholderTextColor={theme.accent}
        value={query}
        onChangeText={handleQueryChange}
      />
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 8,
      padding: 10,
      color: theme.text,
      backgroundColor: theme.card,
      marginBottom: 8,
    },
    dropdown: {
      flexDirection: "row",
      gap: 8,
    },
    dropdownOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 20,
    },
    activeOption: {
      backgroundColor: theme.primaryLight,
    },
    dropdownText: {
      color: theme.text,
      fontSize: 14,
    },
  });
