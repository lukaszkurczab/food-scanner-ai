import { useTheme } from "../theme/useTheme";
import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

const screenWidth = Dimensions.get("window").width;

type GraphProps = {
  labels: string[];
  data: number[];
};

export const Graph = ({ labels, data }: GraphProps) => {
  const { theme } = useTheme();

  const processedData = data.map((value, index) => ({
    value: isFinite(value) ? value : 0,
    label: labels[index],
  }));

  return (
    <View
      style={{
        marginVertical: 8,
        borderRadius: 16,
        paddingVertical: 10,
        backgroundColor: "#fff",
        alignSelf: "center",
      }}
    >
      <LineChart
        data={processedData}
        height={220}
        width={screenWidth - 20}
        curved
        hideDataPoints
        hideRules
        xAxisLabelTextStyle={{
          rotation: -45,
          textAlign: "center",
          marginTop: 4,
          color: "#000",
        }}
        yAxisTextStyle={{ color: "#000" }}
        thickness={1}
        color={theme.secondary}
        areaChart
        startFillColor={theme.secondary}
        endFillColor={theme.secondary}
        startOpacity={0.8}
        endOpacity={0.1}
        noOfSections={4}
      />
    </View>
  );
};
