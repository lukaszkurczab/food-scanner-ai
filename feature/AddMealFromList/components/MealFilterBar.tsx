import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useState } from "react";

type FilterType = "all" | "food" | "drink";

type Props = {
  onFilterChange: (filters: { query: string; type: FilterType }) => void;
};

export const MealFilterBar = ({ onFilterChange }: Props) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<FilterType>("all");

  const handleTypeChange = (newType: FilterType) => {
    setType(newType);
    onFilterChange({ query, type: newType });
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    onFilterChange({ query: text, type });
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
      <View style={styles.dropdown}>
        {["all", "food", "drink"].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.dropdownOption,
              type === option && styles.activeOption,
            ]}
            onPress={() => handleTypeChange(option as FilterType)}
          >
            <Text style={styles.dropdownText}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
