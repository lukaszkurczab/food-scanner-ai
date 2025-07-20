import { View, Text } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { Nutrients } from "../../types";
import { useTheme } from "@/src/theme/index";

type NutritionChartProps = {
  nutrition: Nutrients;
};

export const NutritionChart = ({ nutrition }: NutritionChartProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const getMacroChartData = (data: Nutrients) => [
    {
      value: data.protein,
      color: theme.macro.protein,
      label: `${data.protein}g Protein`,
    },
    {
      value: data.fat,
      color: theme.macro.fat,
      label: `${data.fat}g Fat`,
    },
    {
      value: data.carbs,
      color: theme.macro.carbs,
      label: `${data.carbs}g Carbs`,
    },
  ];

  return (
    <View
      style={{
        height: 245,
        alignItems: "center",
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          gap: 16,
        }}
      >
        <View
          style={{
            width: 200,
            height: 200,
          }}
        >
          <PolarChart
            data={getMacroChartData(nutrition)}
            labelKey="label"
            valueKey="value"
            colorKey="color"
          >
            <Pie.Chart />
          </PolarChart>
        </View>
        <View
          style={{
            justifyContent: "center",
            gap: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                ...styles.colorIndicator,
                backgroundColor: theme.macro.carbs,
              }}
            />
            <Text style={styles.text}>{nutrition.carbs}g Carbs</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                ...styles.colorIndicator,
                backgroundColor: theme.macro.protein,
              }}
            />
            <Text style={styles.text}>{nutrition.protein}g Protein</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                ...styles.colorIndicator,
                backgroundColor: theme.macro.fat,
              }}
            />
            <Text style={styles.text}>{nutrition.fat}g Fat</Text>
          </View>
        </View>
      </View>
      <Text style={{ ...styles.text, marginTop: 16 }}>
        Calorific value: {nutrition.kcal}kcal
      </Text>
    </View>
  );
};

const getStyles = (theme: any) => ({
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  text: {
    fontSize: 18,
    color: theme.text,
  },
});
