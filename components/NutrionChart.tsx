import { View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Nutrients } from "../types";

type NutrionChartProps = {
  nutrition: Nutrients;
};

export const getMacroChartData = (data: Nutrients) => [
  {
    value: data.protein,
    color: "#4CAF50",
    text: `${data.protein}g Protein`,
  },
  {
    value: data.fat,
    color: "#FFC107",
    text: `${data.fat}g Fat`,
  },
  {
    value: data.carbs,
    color: "#2196F3",
    text: `${data.carbs}g Carbs`,
  },
];

export const NutrionChart = ({ nutrition }: NutrionChartProps) => {
  return (
    <View style={{ alignItems: "center" }}>
      <PieChart
        data={getMacroChartData(nutrition)}
        donut
        showText
        textColor="#333"
        textSize={12}
        radius={90}
        innerRadius={50}
        focusOnPress
        showValuesAsLabels
        centerLabelComponent={() => (
          <View>
            {/* Możesz tu wstawić np. sumę kalorii lub nazwę "Makroskładniki" */}
          </View>
        )}
      />
    </View>
  );
};
