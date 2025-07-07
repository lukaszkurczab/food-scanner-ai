import { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { useUserContext } from "@/context/UserContext";
import { useTheme } from "@/theme/useTheme";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Tile } from "@/components";
import { Meal } from "@/types";
import { RootStackParamList } from "@/navigation/navigate";
import { MealFilterBar } from "../components/MealFilterBar";

type Navigation = StackNavigationProp<RootStackParamList, "AddMealFromList">;

const AddMealFromList = () => {
  const { userData } = useUserContext();
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();

  const styles = getStyles(theme);
  const savedMeals: Meal[] = userData?.savedMeals ?? [];
  const [filters, setFilters] = useState({ query: "", type: "all" as const });

  const filteredMeals = useMemo(() => {
    return savedMeals.filter((meal) => {
      const matchesQuery = meal.name
        .toLowerCase()
        .includes(filters.query.toLowerCase());
      const matchesType =
        filters.type === "all" ||
        meal.ingredients.some((i) => i.type === filters.type);
      return matchesQuery && matchesType;
    });
  }, [savedMeals, filters]);

  const handleSelect = (meal: Meal) => {
    navigation.navigate("AddMealManual", {
      prefill: meal, // wymaga dodania obsługi w AddMealManualScreen
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MealFilterBar onFilterChange={setFilters} />
      {filteredMeals.map((meal) => (
        <Tile key={meal.id} onPress={() => handleSelect(meal)}>
          <>
            <Text style={styles.name}>{meal.name}</Text>
            <Text style={styles.kcal}>{meal.nutrition.kcal} kcal</Text>
          </>
        </Tile>
      ))}
    </ScrollView>
  );
};

export default AddMealFromList;

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    name: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    kcal: {
      fontSize: 14,
      color: theme.accent,
    },
  });
