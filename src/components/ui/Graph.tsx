import { useTheme } from "@/src/theme/index";
import { Dimensions, View, Text } from "react-native";
import { CartesianChart, Area } from "victory-native";
import { LinearGradient, vec } from "@shopify/react-native-skia";

const screenWidth = Dimensions.get("window").width;

type GraphProps = {
  labels: string[];
  data: number[];
  yUnit?: string;
};

export const Graph = ({ labels, data, yUnit = "" }: GraphProps) => {
  const theme = useTheme();

  const chartData = data.map((value, index) => ({
    x: labels[index],
    y: isFinite(value) ? value : 0,
  }));

  return (
    <View style={{ width: screenWidth - 64, height: 300 }}>
      <Text style={{ color: theme.text, marginBottom: 8 }}>[{yUnit}]</Text>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        axisOptions={{
          labelColor: theme.text,
          lineColor: theme.border,
        }}
      >
        {({ points, chartBounds }) => (
          <Area
            points={points.y}
            y0={chartBounds.bottom}
            connectMissingData={true}
          >
            <LinearGradient
              start={vec(chartBounds.left, chartBounds.top)}
              end={vec(chartBounds.left, chartBounds.bottom)}
              colors={[theme.accent, "#FFB74D"]}
            />
          </Area>
        )}
      </CartesianChart>
    </View>
  );
};
