import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../../theme/useTheme";
import { Button, Tile } from "../../../components";
import { getTodayMeal } from "../../../services";
import { Meal, MealHistory } from "../../../types";
import { RootStackParamList } from "../../../navigation/navigate";
import { useUserContext } from "@/context/UserContext";
import { TdeeProgress } from "../components/TdeeProgrss";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

const HomeScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [todayMeal, setTodayMeal] = useState<MealHistory[]>([]);
  const { userData } = useUserContext();

  useEffect(() => {
    const todaysMeal = getTodayMeal(userData?.history || []);
    setTodayMeal(todaysMeal);
  }, [userData?.history]);

  const totalCalories = useMemo(() => {
    return todayMeal.reduce((sum, meal) => sum + meal.nutrition.kcal, 0);
  }, [todayMeal]);

  const tdee = userData?.nutritionSurvey?.adjustedTdee ?? 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TdeeProgress totalCalories={totalCalories} tdee={tdee} />
      <View style={styles.mealList}>
        {todayMeal.map((meal, i) => (
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
        ))}
      </View>
      <Button
        text="Add a new meal"
        onPress={() => navigation.navigate("MealAddMethod")}
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
