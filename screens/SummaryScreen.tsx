import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { getMealHistory } from "../services";
import { Graph } from "../components";
import { useTheme } from "../theme/useTheme";

const SummaryScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
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
        const all = await getMealHistory();
        let days = 7;

        let startDate: Date | null = null;
        let endDate: Date = new Date();

        if (timeRange === 30) {
          days = 30;
        }

        const daysMap: Record<
          string,
          { kcal: number; protein: number; carbs: number; fat: number }
        > = {};

        let dates: Date[] = [];

        if (startDate) {
          const current = new Date(startDate);
          while (current <= endDate) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
        } else {
          for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date);
          }
        }

        dates.forEach((date) => {
          const key = `${date.getMonth() + 1}/${date.getDate()}`;
          daysMap[key] = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
        });

        for (const meal of all) {
          const date = new Date(meal.date);
          if (isNaN(date.getTime())) continue;

          let include = false;
          const daysAgo = Math.floor(
            (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysAgo < days) include = true;

          if (include) {
            const key = `${date.getMonth() + 1}/${date.getDate()}`;
            if (!daysMap[key]) continue;
            daysMap[key].kcal += meal.nutrition?.kcal || 0;
            daysMap[key].protein += meal.nutrition?.protein || 0;
            daysMap[key].carbs += meal.nutrition?.carbs || 0;
            daysMap[key].fat += meal.nutrition?.fat || 0;
          }
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
  }, [timeRange]);

  const handleTilePress = (data: number[], unit: string) => {
    setGraphData(data);
    setGraphUnit(unit);
  };

  return (
    <ScrollView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
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
                    graphData === kcalData ? theme.primary : theme.primaryLight,
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
                      ? theme.primary
                      : theme.primaryLight,
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
                      ? theme.primary
                      : theme.primaryLight,
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
                    graphData === fatData ? theme.primary : theme.primaryLight,
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
    chartTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginLeft: 10,
      marginTop: 20,
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
    loadingText: {
      marginTop: 10,
    },
  });

export default SummaryScreen;
