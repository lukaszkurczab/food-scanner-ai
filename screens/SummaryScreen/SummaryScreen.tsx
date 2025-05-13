import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { getMealHistory } from "../../services";
import { Graph } from "@/components";

export default function SummaryScreen() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7" | "30">("7");
  const [graphData, setGraphData] = useState<number[]>([]);

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

        if (timeRange === "30") {
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
        const kcalArr = keys.map((d) => daysMap[d]?.kcal || 0);
        const proteinArr = keys.map((d) => daysMap[d]?.protein || 0);
        const carbsArr = keys.map((d) => daysMap[d]?.carbs || 0);
        const fatArr = keys.map((d) => daysMap[d]?.fat || 0);

        setLabels(keys);
        setGraphData(kcalArr);
        setKcalData(kcalArr);
        setProteinData(proteinArr);
        setCarbsData(carbsArr);
        setFatData(fatArr);

        const totalDays = kcalArr.length || 1;
        setAverages({
          kcal: Math.round(kcalArr.reduce((a, b) => a + b, 0) / totalDays),
          protein: Math.round(
            proteinArr.reduce((a, b) => a + b, 0) / totalDays
          ),
          carbs: Math.round(carbsArr.reduce((a, b) => a + b, 0) / totalDays),
          fat: Math.round(fatArr.reduce((a, b) => a + b, 0) / totalDays),
        });
      } catch {
        // Handle error if needed
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.rangeSelector}>
        {["7", "30"].map((val) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.rangeButton,
              timeRange === val && styles.rangeButtonActive,
            ]}
            onPress={() => {
              setTimeRange(val as "7" | "30");
            }}
          >
            <Text
              style={[
                styles.rangeButtonText,
                timeRange === val && styles.rangeButtonTextActive,
              ]}
            >
              {val === "7" ? "Last 7 days" : "Last 30 days"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={[
            styles.summaryBox,
            { backgroundColor: graphData === kcalData ? "#d0d0f0" : "#f0f0f8" },
          ]}
          onPress={() => setGraphData(kcalData)}
        >
          <Text style={styles.summaryLabel}>Avg Calories</Text>
          <Text style={styles.summaryValue}>{averages.kcal}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.summaryBox,
            {
              backgroundColor:
                graphData === proteinData ? "#d0d0f0" : "#f0f0f8",
            },
          ]}
          onPress={() => setGraphData(proteinData)}
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
              backgroundColor: graphData === carbsData ? "#d0d0f0" : "#f0f0f8",
            },
          ]}
          onPress={() => setGraphData(carbsData)}
        >
          <Text style={styles.summaryLabel}>Avg Carbs</Text>
          <Text style={styles.summaryValue}>{averages.carbs}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.summaryBox,
            { backgroundColor: graphData === fatData ? "#d0d0f0" : "#f0f0f8" },
          ]}
          onPress={() => setGraphData(fatData)}
        >
          <Text style={styles.summaryLabel}>Avg Fat</Text>
          <Text style={styles.summaryValue}>{averages.fat}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      ) : (
        <Graph labels={labels} data={graphData} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    backgroundColor: "#fff",
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
    backgroundColor: "#f0f0f0",
  },
  rangeButtonActive: {
    backgroundColor: "#d0d0f0",
  },
  rangeButtonText: {
    color: "#333",
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
    backgroundColor: "#f0f0f8",
    padding: 16,
    borderRadius: 16,
    width: "45%",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#555",
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
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: "center",
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
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
