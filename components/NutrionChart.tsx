import { View } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { Nutrients } from "../types";
import { useFont } from "@shopify/react-native-skia";

type NutrionChartProps = {
  nutrition: Nutrients;
};

const inter = require("../assets/fonts/inter.ttf");

const getMacroChartData = (data: Nutrients) => [
  {
    value: data.protein,
    color: "#4CAF50",
    label: `${data.protein}g Protein`,
  },
  {
    value: data.fat,
    color: "#FFC107",
    label: `${data.fat}g Fat`,
  },
  {
    value: data.carbs,
    color: "#2196F3",
    label: `${data.carbs}g Carbs`,
  },
];

export const NutrionChart = ({ nutrition }: NutrionChartProps) => {
  const font = useFont(inter, 16);

  return (
    <View
      style={{
        height: 300,
        width: 300,
        alignSelf: "center",
      }}
    >
      <PolarChart
        data={getMacroChartData(nutrition)}
        labelKey="label"
        valueKey="value"
        colorKey="color"
      >
        <Pie.Chart>
          {({ slice }) => (
            <Pie.Slice>
              <Pie.Label font={font} color={"#111"} />
            </Pie.Slice>
          )}
        </Pie.Chart>
      </PolarChart>
    </View>
  );
};
