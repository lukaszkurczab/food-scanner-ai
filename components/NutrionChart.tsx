import { Dimensions } from "react-native";
import { Nutrients } from "@/types";
import { PieChart } from "react-native-chart-kit";

type NutrionChartProps = {
  nutrition: Nutrients;
};

export const getMacroChartData = (data: Nutrients) => [
  {
    name: "g Protein",
    value: data.protein,
    color: "#4CAF50",
    legendFontColor: "#333",
    legendFontSize: 14,
  },
  {
    name: "g Fat",
    value: data.fat,
    color: "#FFC107",
    legendFontColor: "#333",
    legendFontSize: 14,
  },
  {
    name: "g Carbs",
    value: data.carbs,
    color: "#2196F3",
    legendFontColor: "#333",
    legendFontSize: 14,
  },
];

export const NutrionChart = ({ nutrition }: NutrionChartProps) => {
  const screenWidth = Dimensions.get("window").width;

  return (
    <PieChart
      data={getMacroChartData(nutrition)}
      width={screenWidth}
      height={180}
      chartConfig={{
        color: () => `#888`,
        backgroundColor: "#fff",
        backgroundGradientFrom: "#fff",
        backgroundGradientTo: "#fff",
        decimalPlaces: 1,
      }}
      accessor={"value"}
      backgroundColor={"transparent"}
      paddingLeft={"0"}
      absolute
    />
  );
};
