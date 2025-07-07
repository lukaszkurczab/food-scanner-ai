import { useMemo, useState } from "react";
import { StyleSheet, ScrollView, Text } from "react-native";
import { useUserContext } from "@/context/UserContext";
import { useTheme } from "@/theme/useTheme";
import { Tile } from "@/components";
import { Meal } from "@/types";
import { MealFilterBar } from "../components/MealFilterBar";

const SavedMealsScreen = () => {
  const { userData } = useUserContext();
  const { theme } = useTheme();
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MealFilterBar onFilterChange={setFilters} />
      {filteredMeals.map((meal) => (
        <Tile key={meal.id}>
          <>
            <Text style={styles.name}>{meal.name}</Text>
            <Text style={styles.kcal}>{meal.nutrition.kcal} kcal</Text>
          </>
        </Tile>
      ))}
    </ScrollView>
  );
};

export default SavedMealsScreen;

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
