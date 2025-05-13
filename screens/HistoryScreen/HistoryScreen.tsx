import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getMealHistory } from "../../services";
import { Meal } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { format, isToday } from "date-fns";
import { useTheme } from "@/theme/useTheme";

type RootStackParamList = {
  History: undefined;
  MealDetail: { meal: Meal };
};

type HistoryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "History"
>;

type SectionData = {
  title: string;
  totalKcal: number;
  data: Meal[];
};

export default function HistoryScreen({
  navigation,
}: {
  navigation: HistoryScreenNavigationProp;
}) {
  const { theme } = useTheme();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const load = async () => {
      const data = await getMealHistory();
      const grouped: { [key: string]: Meal[] } = {};

      data.forEach((meal) => {
        const dateKey = isToday(new Date(meal.date))
          ? "Today"
          : format(new Date(meal.date), "d MMM");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(meal);
      });

      const sectionData = Object.keys(grouped).map((key) => ({
        title: key,
        totalKcal: grouped[key].reduce((sum, m) => sum + m.nutrition.kcal, 0),
        data: grouped[key],
      }));

      setSections(sectionData);

      const initialExpanded: { [key: string]: boolean } = {};
      sectionData.forEach((section) => {
        initialExpanded[section.title] = section.title === "Today";
      });
      setExpandedSections(initialExpanded);
    };
    load();
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <ScrollView style={styles.container}>
      {sections.map((section) => {
        const isExpanded = expandedSections[section.title];

        return (
          <View key={section.title} style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.title)}
              activeOpacity={0.7}
            >
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
                color={theme.secondary}
              />
            </TouchableOpacity>

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
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    backgroundColor: "#fff",
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f3f8",
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#555",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 500,
    marginBottom: 4,
  },
});
