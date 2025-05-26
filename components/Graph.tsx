import { useTheme } from "../theme/useTheme";
import { Dimensions, View, Text } from "react-native";
import { CartesianChart, Area } from "victory-native";
import { LinearGradient, useFont, vec } from "@shopify/react-native-skia";

const screenWidth = Dimensions.get("window").width;
const inter = require("../assets/fonts/inter.ttf");

type GraphProps = {
  labels: string[];
  data: number[];
  yUnit?: string;
};

export const Graph = ({ labels, data, yUnit = "" }: GraphProps) => {
  const { theme } = useTheme();
  const font = useFont(inter);

  const chartData = data.map((value, index) => ({
    x: labels[index],
    y: isFinite(value) ? value : 0,
  }));

  return (
    <View style={{ width: screenWidth - 64, height: 300 }}>
      <Text>[{yUnit}]</Text>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        axisOptions={{ font }}
      >
        {({ points, chartBounds }) => (
          <Area
            points={points.y}
            y0={chartBounds.bottom}
            connectMissingData={true}
          >
            <LinearGradient
              start={vec(chartBounds.bottom, 200)}
              end={vec(chartBounds.bottom, chartBounds.bottom)}
              colors={[theme.secondary, "#FFB74D"]}
            />
          </Area>
        )}
      </CartesianChart>
    </View>
  );
};
