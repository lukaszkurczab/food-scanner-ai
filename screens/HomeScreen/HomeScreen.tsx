import { View, Text, ScrollView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTheme } from "@/theme/useTheme";
import { useNavigation } from "@react-navigation/native";
import Tile from "@/components/Tile";
import { getTodayMeal, saveMealToHistory } from "@/services";
import { useEffect, useState } from "react";
import { Meal } from "@/types/index";

type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  History: undefined;
  Chat: undefined;
  WeeklySummary: undefined;
  MealDetail: {
    meal: Meal;
  };
};
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [todayMeal, setTodayMeal] = useState<Meal[] | []>([]);

  async function fetchTodayMeal() {
    const meal = await getTodayMeal();
    setTodayMeal(meal);
  }

  // saveMealToHistory({
  //   id: Math.random().toString(),
  //   image: "https://example.com/image.jpg",
  //   date: new Date().toISOString(),
  //   ingredients: [
  //     { name: "Chicken", amount: 200 },
  //     { name: "Rice", amount: 150 },
  //   ],
  //   nutrition: {
  //     kcal: 500,
  //     protein: 30,
  //     fat: 10,
  //     carbs: 60,
  //   },
  // });

  useEffect(() => {
    fetchTodayMeal();
  }, []);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{
        gap: 16,
        backgroundColor: theme.background,
        width: "100%",
        padding: 16,
      }}
    >
      <View style={{ width: "100%" }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: 600,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Today's meals
        </Text>
        <View style={{ gap: 8 }}>
          {todayMeal.length > 0 ? (
            <View style={{ gap: 8 }}>
              {todayMeal.map((meal, i) => (
                <Tile
                  onPress={() =>
                    navigation.navigate("MealDetail", { meal: meal })
                  }
                  key={meal.id + i}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                      }}
                    >
                      Meal name
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: 400,
                      }}
                    >
                      {meal.nutrition.kcal} kcal
                    </Text>
                  </View>
                </Tile>
              ))}
            </View>
          ) : (
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: 400,
                  textAlign: "center",
                }}
              >
                You have no meals scanned today
              </Text>
            </View>
          )}
        </View>
      </View>
      <View
        style={{
          paddingVertical: 32,
        }}
      >
        <Tile
          style={{
            backgroundColor: theme.secondary,
            alignItems: "center",
            borderRadius: 32,
          }}
          onPress={() => navigation.navigate("Camera")}
        >
          <Text
            style={{
              fontWeight: 600,
              fontSize: 18,
            }}
          >
            Scan a new meal
          </Text>
        </Tile>
      </View>
    </ScrollView>
  );
}
