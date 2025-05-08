import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { getMealHistory } from "../../services";

const screenWidth = Dimensions.get("window").width;
const daysEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const getEnglishDayShort = (date: Date) => daysEN[date.getDay()];

export default function WeeklySummaryScreen() {
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<string[]>([]);
  const [kcalData, setKcalData] = useState<number[]>([]);
  const [proteinData, setProteinData] = useState<number[]>([]);
  const [carbsData, setCarbsData] = useState<number[]>([]);
  const [fatData, setFatData] = useState<number[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const all = await getMealHistory();
        const daysMap: Record<
          string,
          { kcal: number; protein: number; carbs: number; fat: number }
        > = {};

        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const key = getEnglishDayShort(date);
          daysMap[key] = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
        }

        for (const meal of all) {
          const date = new Date(meal.date);
          if (isNaN(date.getTime())) continue;
          const day = getEnglishDayShort(date);
          if (!daysMap[day]) continue;

          daysMap[day].kcal += meal.nutrition?.kcal || 0;
          daysMap[day].protein += meal.nutrition?.protein || 0;
          daysMap[day].carbs += meal.nutrition?.carbs || 0;
          daysMap[day].fat += meal.nutrition?.fat || 0;
        }

        const keys = Object.keys(daysMap);
        setLabels(keys);
        setKcalData(keys.map((d) => daysMap[d]?.kcal || 0));
        setProteinData(keys.map((d) => daysMap[d]?.protein || 0));
        setCarbsData(keys.map((d) => daysMap[d]?.carbs || 0));
        setFatData(keys.map((d) => daysMap[d]?.fat || 0));
      } catch {
        // Optional: handle error
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }

  const renderChart = (title: string, data: number[]) => (
    <>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={{
          labels,
          datasets: [{ data: data.map((v) => (isFinite(v) ? v : 0)) }],
        }}
        width={screenWidth - 20}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    </>
  );

  return (
    <ScrollView style={styles.container}>
      {renderChart("Calories", kcalData)}
      {renderChart("Protein", proteinData)}
      {renderChart("Carbohydrates", carbsData)}
      {renderChart("Fat", fatData)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
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
});
