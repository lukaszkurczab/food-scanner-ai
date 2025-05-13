import { useTheme } from "@/theme/useTheme";
import { Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

type GraphProps = {
  labels: string[];
  data: number[];
};

export const Graph = ({ labels, data }: GraphProps) => {
  const { theme } = useTheme();
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    fillShadowGradient: theme.secondary,
    fillShadowGradientOpacity: 0.8,
    strokeWidth: 1,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <LineChart
      data={{
        labels,
        datasets: [{ data: data.map((v) => (isFinite(v) ? v : 0)) }],
      }}
      width={screenWidth - 20}
      height={220}
      chartConfig={chartConfig}
      bezier
      withDots={false}
      withVerticalLines={false}
      yAxisSuffix=" kcal"
      verticalLabelRotation={-45}
      xLabelsOffset={10}
      style={{
        marginVertical: 8,
        borderRadius: 16,
        alignSelf: "center",
      }}
    />
  );
};
