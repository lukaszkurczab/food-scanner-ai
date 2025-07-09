import { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { useUserContext } from "@/context/UserContext";
import { useTheme } from "@/theme/useTheme";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Tile } from "@/components";
import { Meal, MealHistory } from "@/types";
import { RootStackParamList } from "@/navigation/navigate";
import { MealFilterBar } from "../components/MealFilterBar";
import { useMealContext } from "@/context/MealContext";

type Navigation = StackNavigationProp<RootStackParamList, "AddMealFromList">;

const AddMealFromList = () => {
  const { userData } = useUserContext();
  const { addMeal } = useMealContext();
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();

  const styles = getStyles(theme);
  const savedMeals = userData?.myMeals ?? [];
  const [filters, setFilters] = useState({ query: "" as const });

  const filteredMeals = useMemo(() => {
    return savedMeals.filter((meal) => {
      const matchesQuery = meal.name
        .toLowerCase()
        .includes(filters.query.toLowerCase());
      return matchesQuery;
    });
  }, [savedMeals, filters]);

  const handleFilter = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleSelect = (meal: MealHistory) => {
    const { ingredients, nutrition } = meal;

    const parsedIngredients = ingredients.map((name, index) => ({
      name,
      amount: 100,
      fromTable: true,
      type: "food" as const,
      protein: index === 0 ? nutrition.protein : 0,
      carbs: index === 0 ? nutrition.carbs : 0,
      fat: index === 0 ? nutrition.fat : 0,
      kcal: index === 0 ? nutrition.kcal : 0,
    }));

    const mealData = {
      id: uuidv4(),
      image: "",
      ingredients: parsedIngredients,
    };

    addMeal(mealData);
    navigation.navigate("Result");
  };

  const handlePreview = (meal: MealHistory) => {
    navigation.navigate("MealDetail", { meal });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MealFilterBar onFilterChange={handleFilter} />
      <View style={{ gap: 8 }}>
        {filteredMeals.map((meal) => (
          <Tile key={meal.id} onPress={() => handlePreview(meal)}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text style={styles.name}>{meal.name}</Text>
                <Text style={styles.kcal}>{meal.nutrition.kcal} kcal</Text>
              </View>
              <TouchableOpacity onPress={() => handleSelect(meal)}>
                <Text>Select</Text>
              </TouchableOpacity>
            </View>
          </Tile>
        ))}
      </View>
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
