import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Button, ProgressBar } from "@/components";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/navigate";

type TdeeProgressProps = {
  totalCalories: number;
  tdee?: number;
};

export const TdeeProgress = ({ totalCalories, tdee }: TdeeProgressProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleCalculateTdee = () => {
    navigation.navigate("NutritionSurvey");
  };

  if (!tdee) {
    return (
      <View style={styles.container}>
        <Button text="Calculate Tdee" onPress={handleCalculateTdee} />
      </View>
    );
  }

  const progress = totalCalories / tdee;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {totalCalories} kcal / {tdee} kcal
      </Text>
      <ProgressBar progress={progress} />
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 24,
    },
    text: {
      fontSize: 16,
      fontWeight: "400",
      textAlign: "center",
      color: theme.text,
      marginBottom: 8,
    },
  });
