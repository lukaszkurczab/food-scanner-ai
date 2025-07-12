import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Button, Graph } from "@components/index";
import { useTheme } from "@theme/index";
import { useUserContext } from "@/context/UserContext";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/navigate";

const SummaryScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const styles = getStyles(theme);
  const { userData } = useUserContext();

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  const [graphData, setGraphData] = useState<number[]>([]);
  const [graphUnit, setGraphUnit] = useState<string>("kcal");

  const [labels, setLabels] = useState<string[]>([]);
  const [kcalData, setKcalData] = useState<number[]>([]);
  const [proteinData, setProteinData] = useState<number[]>([]);
  const [carbsData, setCarbsData] = useState<number[]>([]);
  const [fatData, setFatData] = useState<number[]>([]);

  const [averages, setAverages] = useState({
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const all = userData?.history ?? [];
        let days = timeRange;

        const dates: Date[] = [];

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date);
        }

        const daysMap: Record<
          string,
          { kcal: number; protein: number; carbs: number; fat: number }
        > = {};

        dates.forEach((date) => {
          const key = `${date.getMonth() + 1}/${date.getDate()}`;
          daysMap[key] = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
        });

        for (const meal of all) {
          const date = new Date(meal.date);
          if (isNaN(date.getTime())) continue;

          const daysAgo = Math.floor(
            (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysAgo >= days) continue;

          const key = `${date.getMonth() + 1}/${date.getDate()}`;
          if (!daysMap[key]) continue;
          daysMap[key].kcal += meal.nutrition?.kcal || 0;
          daysMap[key].protein += meal.nutrition?.protein || 0;
          daysMap[key].carbs += meal.nutrition?.carbs || 0;
          daysMap[key].fat += meal.nutrition?.fat || 0;
        }

        const keys = Object.keys(daysMap);
        const filteredLabels = keys.map((d) => {
          const [month, day] = d.split("/");
          return `${day}/${month}`;
        });
        const kcalArr = keys.map((d) => daysMap[d]?.kcal || 0);
        const proteinArr = keys.map((d) => daysMap[d]?.protein || 0);
        const carbsArr = keys.map((d) => daysMap[d]?.carbs || 0);
        const fatArr = keys.map((d) => daysMap[d]?.fat || 0);

        setLabels(filteredLabels);
        setGraphData(kcalArr);
        setKcalData(kcalArr);
        setProteinData(proteinArr);
        setCarbsData(carbsArr);
        setFatData(fatArr);

        const countValidDays = (arr: number[]) =>
          arr.filter((v) => v > 0).length || 1;

        const validDays = countValidDays(kcalArr);

        setAverages({
          kcal: Math.round(kcalArr.reduce((a, b) => a + b, 0) / validDays),
          protein: Math.round(
            proteinArr.reduce((a, b) => a + b, 0) / validDays
          ),
          carbs: Math.round(carbsArr.reduce((a, b) => a + b, 0) / validDays),
          fat: Math.round(fatArr.reduce((a, b) => a + b, 0) / validDays),
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange, userData]);

  const handleTilePress = (data: number[], unit: string) => {
    setGraphData(data);
    setGraphUnit(unit);
  };

  return (
    <ScrollView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : graphData.some((num) => num !== 0) ? (
        <>
          <View style={styles.rangeSelector}>
            {[7, 30].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.rangeButton,
                  timeRange === val && styles.rangeButtonActive,
                ]}
                onPress={() => {
                  setTimeRange(val as 7 | 30);
                }}
              >
                <Text style={timeRange === val && styles.rangeButtonTextActive}>
                  {val === 7 ? "Last 7 days" : "Last 30 days"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={[
                styles.summaryBox,
                {
                  backgroundColor:
                    graphData === kcalData
                      ? theme.accent
                      : theme.accentSecondary,
                },
              ]}
              onPress={() => handleTilePress(kcalData, "kcal")}
            >
              <Text style={styles.summaryLabel}>Avg Calories</Text>
              <Text style={styles.summaryValue}>{averages.kcal}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.summaryBox,
                {
                  backgroundColor:
                    graphData === proteinData
                      ? theme.accent
                      : theme.accentSecondary,
                },
              ]}
              onPress={() => handleTilePress(proteinData, "g")}
            >
              <Text style={styles.summaryLabel}>Avg Protein</Text>
              <Text style={styles.summaryValue}>{averages.protein}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.summaryRow, { marginBottom: 48 }]}>
            <TouchableOpacity
              style={[
                styles.summaryBox,
                {
                  backgroundColor:
                    graphData === carbsData
                      ? theme.accent
                      : theme.accentSecondary,
                },
              ]}
              onPress={() => handleTilePress(carbsData, "g")}
            >
              <Text style={styles.summaryLabel}>Avg Carbs</Text>
              <Text style={styles.summaryValue}>{averages.carbs}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.summaryBox,
                {
                  backgroundColor:
                    graphData === fatData
                      ? theme.accent
                      : theme.accentSecondary,
                },
              ]}
              onPress={() => handleTilePress(fatData, "g")}
            >
              <Text style={styles.summaryLabel}>Avg Fat</Text>
              <Text style={styles.summaryValue}>{averages.fat}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chart}>
            <Graph labels={labels} data={graphData} yUnit={graphUnit} />
          </View>

          <Button
            text="Show history"
            onPress={() => navigation.navigate("History")}
          />
        </>
      ) : (
        <Text style={styles.noMealsText}>You have no meals history</Text>
      )}
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingTop: 40,
      backgroundColor: theme.background,
    },
    noMealsText: {
      fontSize: 16,
      fontWeight: "400",
      textAlign: "center",
    },
    rangeSelector: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 20,
    },
    rangeButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: theme.primaryLight,
    },
    rangeButtonActive: {
      opacity: 1,
      backgroundColor: theme.primary,
    },
    rangeButtonTextActive: {
      fontWeight: "bold",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 10,
    },
    summaryBox: {
      padding: 16,
      borderRadius: 16,
      width: "45%",
      alignItems: "center",
    },
    summaryLabel: {
      fontSize: 14,
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: "bold",
    },
    chart: {
      marginHorizontal: 16,
      overflow: "hidden",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
  });

export default SummaryScreen;
