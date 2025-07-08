import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Button, Checkbox, TextInput } from "@/components";

const AddMealManualScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saveToHistory, setSaveToHistory] = useState(true);

  const handleSave = () => {
    // TODO: validation and saving
    console.log({
      name,
      amount,
      macros: { protein, carbs, fat },
      saveToHistory,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Add a Meal</Text>

        <Text style={styles.label}>Meal name</Text>
        <TextInput
          value={name}
          onChange={setName}
          placeholder="e.g. Chicken with rice"
        />

        <Text style={styles.label}>Amount (g/ml)</Text>
        <TextInput
          value={amount}
          onChange={setAmount}
          keyboardType="numeric"
          placeholder="e.g. 300"
        />

        <Text style={styles.section}>
          Macronutrients (for the above amount)
        </Text>

        <Text style={styles.label}>Protein (g)</Text>
        <TextInput
          value={protein}
          onChange={setProtein}
          keyboardType="numeric"
          placeholder="e.g. 25"
        />

        <Text style={styles.label}>Carbs (g)</Text>
        <TextInput
          value={carbs}
          onChange={setCarbs}
          keyboardType="numeric"
          placeholder="e.g. 40"
        />

        <Text style={styles.label}>Fat (g)</Text>
        <TextInput
          value={fat}
          onChange={setFat}
          keyboardType="numeric"
          placeholder="e.g. 12"
        />

        <View style={styles.checkboxContainer}>
          <Checkbox
            checked={saveToHistory}
            onCheckedChange={setSaveToHistory}
            label="Save to My Meals"
          />
        </View>

        <Button text="Confirm" onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddMealManualScreen;

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
    },
    header: {
      fontSize: 24,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 20,
    },
    label: {
      marginTop: 12,
      fontSize: 14,
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 8,
      padding: 10,
      color: theme.text,
      marginTop: 4,
    },
    section: {
      fontSize: 18,
      fontWeight: "500",
      color: theme.text,
      marginTop: 24,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      marginBottom: 24,
    },
    checkboxLabel: {
      marginLeft: 8,
      color: theme.text,
      fontSize: 14,
    },
  });
