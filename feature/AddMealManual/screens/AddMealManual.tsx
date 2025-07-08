import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { Button, Checkbox, TextInput } from "@/components";
import { useMealContext } from "@/context/MealContext";
import { useNavigation } from "@react-navigation/native";

type ParsedIngredientsType = {
  name: string;
  amount: number;
  fromTable: boolean;
  type: "food" | "drink";
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
};

type MealDataType = {
  id: string;
  image: string;
  ingredients: ParsedIngredientsType[];
};

const AddMealManualScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { addMeal } = useMealContext();
  const navigation = useNavigation<any>();

  const [ingredients, setIngredients] = useState([
    { id: uuidv4(), name: "", amount: "" },
  ]);
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [kcal, setKcal] = useState("");
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, { id: uuidv4(), name: "", amount: "" }]);
  };

  const handleNameChange = (id: string, newValue: string) => {
    const updated = ingredients.map((item) =>
      item.id === id ? { ...item, name: newValue } : item
    );
    setIngredients(updated);
  };

  const handleAmountChange = (id: string, newValue: string) => {
    const updated = ingredients.map((item) =>
      item.id === id ? { ...item, amount: newValue } : item
    );
    setIngredients(updated);
  };

  const isFormValid = (): boolean => {
    const hasEmptyIngredient = ingredients.some(
      (item) => item.name.trim() === "" || item.amount.trim() === ""
    );
    const missingMacros =
      protein.trim() === "" ||
      carbs.trim() === "" ||
      fat.trim() === "" ||
      kcal.trim() === "";

    return !hasEmptyIngredient && !missingMacros;
  };

  const handleConfirm = () => {
    if (!isFormValid()) {
      setValidationError("Please fill in all required fields.");
      return;
    }

    setValidationError(null);

    const totalProtein = parseFloat(protein) || 0;
    const totalCarbs = parseFloat(carbs) || 0;
    const totalFat = parseFloat(fat) || 0;
    const totalKcal = parseFloat(kcal) || 0;

    const parsedIngredients: ParsedIngredientsType[] = ingredients.map(
      (item, index) => ({
        name: item.name,
        amount: parseInt(item.amount) || 0,
        fromTable: false,
        type: "food",
        protein: index === 0 ? totalProtein : 0,
        carbs: index === 0 ? totalCarbs : 0,
        fat: index === 0 ? totalFat : 0,
        kcal: index === 0 ? totalKcal : 0,
      })
    );

    const mealData: MealDataType = {
      id: uuidv4(),
      image: "",
      ingredients: parsedIngredients,
    };

    addMeal(mealData);
    navigation.navigate("Result");
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
        {ingredients.map((i) => (
          <View key={i.id}>
            <Text style={styles.label}>Meal Ingredient</Text>
            <TextInput
              value={i.name}
              onChange={(newText) => handleNameChange(i.id, newText)}
              placeholder="e.g. Chicken with rice"
            />

            <Text style={styles.label}>Amount (g/ml)</Text>
            <TextInput
              value={i.amount}
              keyboardType="numeric"
              onChange={(newText) => handleAmountChange(i.id, newText)}
              placeholder="e.g. 300"
            />
          </View>
        ))}

        <Button text="Add ingedient" onPress={handleAddIngredient} />

        <Text style={styles.section}>Macronutrients (for 100g/ml)</Text>

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

        <Text style={styles.label}>Kcal (kcal)</Text>
        <TextInput
          value={kcal}
          onChange={setKcal}
          keyboardType="numeric"
          placeholder="e.g. 120"
        />

        <View style={styles.checkboxContainer}>
          <Checkbox
            checked={saveToHistory}
            onCheckedChange={setSaveToHistory}
            label="Save to My Meals"
          />
        </View>

        {validationError && (
          <Text style={styles.errorText}>{validationError}</Text>
        )}

        <Button
          text="Confirm"
          onPress={handleConfirm}
          disabled={!isFormValid()}
        />
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
    errorText: {
      color: "red",
      fontSize: 14,
      marginTop: 10,
      marginBottom: 10,
    },
  });
