import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/useTheme";
import { Button, Tile } from "../components";
import { getTodayMeal, saveMealToHistory } from "../services";
import { Meal } from "../types";
import { RootStackParamList } from "../navigation/navigate";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

const HomeScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [todayMeal, setTodayMeal] = useState<Meal[]>([]);

  useEffect(() => {
    const fetchTodayMeal = async () => {
      const meal = await getTodayMeal();
      setTodayMeal(meal);
    };
    fetchTodayMeal();
  }, []);

  const handleSave = async (mealName: string) => {
    const yesterday = new Date();
    const meal = {
      id: Math.random().toString(36).substring(2, 15),
      name: mealName,
      date: yesterday.setDate(yesterday.getDate() - 1).toString(),
      ingredients: [],
      nutrition: {
        kcal: 234,
        protein: 21,
        carbs: 11,
        fat: 12,
      },
    };
    await saveMealToHistory(meal);
    navigation.navigate("Home");
  };

  //handleSave("new meal");

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.header}>Today's meals</Text>

      <View style={styles.mealList}>
        {todayMeal.length > 0 ? (
          todayMeal.map((meal, i) => (
            <Tile
              key={`${meal.id}-${i}`}
              onPress={() => navigation.navigate("MealDetail", { meal })}
            >
              <>
                <Text style={styles.tileMain}>{meal.name}</Text>
                <Text style={styles.tileSecondary}>
                  {meal.nutrition.kcal} kcal
                </Text>
              </>
            </Tile>
          ))
        ) : (
          <Text style={styles.noMealsText}>
            You have no meals scanned today
          </Text>
        )}
      </View>

      <Button
        text="Scan a new meal"
        onPress={() => navigation.navigate("Camera")}
      />
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 16,
    },
    mealList: {
      gap: 8,
      marginBottom: 32,
    },
    tileMain: {
      fontSize: 18,
      fontWeight: "500",
    },
    tileSecondary: {
      fontSize: 16,
      fontWeight: "400",
    },
    noMealsText: {
      fontSize: 16,
      fontWeight: "400",
      textAlign: "center",
    },
    scanTile: {
      alignItems: "center",
      borderRadius: 32,
    },
    scanText: {
      fontWeight: "600",
      fontSize: 18,
    },
  });

export default HomeScreen;
