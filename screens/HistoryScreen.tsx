import { use, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getMealHistory } from "../services";
import { Meal } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { format, isToday } from "date-fns";
import { useTheme } from "../theme/useTheme";
import { RootStackParamList } from "../navigation/navigate";
import { Tile } from "../components";

type HistoryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "History"
>;

type SectionData = {
  title: string;
  totalKcal: number;
  data: Meal[];
};

const HistoryScreen = ({
  navigation,
}: {
  navigation: HistoryScreenNavigationProp;
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [groupedMeals, setGroupedMeals] = useState<{ [key: string]: Meal[] }>(
    {}
  );
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const load = async () => {
      const data = await getMealHistory();
      const newGrouped: { [key: string]: Meal[] } = {};

      data.forEach((meal) => {
        const dateKey = isToday(new Date(Number(meal.date)))
          ? "Today"
          : format(new Date(Number(meal.date)), "d MMM");

        if (!newGrouped[dateKey]) {
          newGrouped[dateKey] = [];
        }

        newGrouped[dateKey].push(meal);
        setGroupedMeals(newGrouped);
      });
    };
    load();
  }, []);

  useEffect(() => {
    const sectionData = Object.keys(groupedMeals).map((key) => ({
      title: key,
      totalKcal: groupedMeals[key].reduce(
        (sum, m) => sum + m.nutrition.kcal,
        0
      ),
      data: groupedMeals[key],
    }));

    setSections(sectionData);

    const initialExpanded: { [key: string]: boolean } = {};
    sectionData.forEach((section) => {
      initialExpanded[section.title] = section.title === "Today";
    });
    setExpandedSections(initialExpanded);
  }, [groupedMeals]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <ScrollView style={styles.container}>
      {sections.length ? (
        sections.map((section) => {
          const isExpanded = expandedSections[section.title];

          return (
            <View key={section.title} style={styles.sectionContainer}>
              <Tile
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.title)}
              >
                <>
                  <View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionSubtitle}>
                      {section.totalKcal} kcal · {section.data.length}{" "}
                      {section.data.length === 1 ? "meal" : "meals"}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={24}
                  />
                </>
              </Tile>

              {isExpanded &&
                section.data.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.item}
                    onPress={() =>
                      navigation.navigate("MealDetail", { meal: item })
                    }
                  >
                    <View>
                      <Text style={styles.mealName}>Meal name</Text>
                      <Text>{item.nutrition.kcal.toFixed(0)} kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          );
        })
      ) : (
        <Text style={styles.noMealsText}>You have no meals history</Text>
      )}
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 24,
      backgroundColor: theme.background,
    },
    sectionContainer: {
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 600,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.accent,
    },
    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    mealName: {
      fontSize: 18,
      fontWeight: 500,
      marginBottom: 4,
    },
    noMealsText: {
      fontSize: 16,
      fontWeight: "400",
      textAlign: "center",
    },
  });

export default HistoryScreen;
