import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Button, TextInput } from "../../../components";
import { StepView } from "../../../components/StepView";
import { RootStackParamList } from "../../../navigation/navigate";
import { useCalorieCalculator } from "../hooks/useCalorieCalculator";
import { auth } from "@/firebase";
import { Gender, Goal, NutritionSurvey } from "../types/types";
import { useTheme } from "@/theme/useTheme";
import { saveNutritionSurvey } from "../utils/saveNutritionSurvey";

type NutritionSurveyNavigationProp = StackNavigationProp<
  RootStackParamList,
  "NutritionSurvey"
>;

const NutritionSurveyScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NutritionSurveyNavigationProp>();
  const [step, setStep] = useState(0);

  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(175);
  const [activityLevel, setActivityLevel] = useState(1.4);
  const [goal, setGoal] = useState<Goal>("maintenance");

  const handleSubmit = async () => {
    const input = { gender, age, weight, height, activityLevel, goal };
    const result = useCalorieCalculator(input);
    const data: NutritionSurvey = { ...input, ...result };

    const user = auth().currentUser;
    if (user) {
      await saveNutritionSurvey(user, data);
      navigation.navigate("Home");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>Nutrition Survey</Text>

      <StepView step={step} totalSteps={3}>
        <View>
          <Text style={styles.label}>Gender</Text>
          <Button text="Male" onPress={() => setGender("male")} />
          <Button text="Female" onPress={() => setGender("female")} />

          <Text style={styles.label}>Age</Text>
          <TextInput
            keyboardType="numeric"
            value={age.toString()}
            onChange={(v) => setAge(Number(v))}
          />

          <Button text="Next" onPress={() => setStep(1)} />
        </View>

        <View>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            keyboardType="numeric"
            value={weight.toString()}
            onChange={(v) => setWeight(Number(v))}
          />

          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            keyboardType="numeric"
            value={height.toString()}
            onChange={(v) => setHeight(Number(v))}
          />

          <Button text="Back" onPress={() => setStep(0)} />
          <Button text="Next" onPress={() => setStep(2)} />
        </View>

        <View>
          <Text style={styles.label}>Activity Level</Text>
          <Button
            text="Sedentary (little or no exercise)"
            onPress={() => setActivityLevel(1.2)}
            variant={activityLevel === 1.2 ? "primary" : "secondary"}
          />
          <Button
            text="Lightly active (light exercise/sports 1–3 days/week)"
            onPress={() => setActivityLevel(1.375)}
            variant={activityLevel === 1.375 ? "primary" : "secondary"}
          />
          <Button
            text="Moderately active (moderate exercise/sports 3–5 days/week)"
            onPress={() => setActivityLevel(1.55)}
            variant={activityLevel === 1.55 ? "primary" : "secondary"}
          />
          <Button
            text="Very active (hard exercise/sports 6–7 days/week)"
            onPress={() => setActivityLevel(1.725)}
            variant={activityLevel === 1.725 ? "primary" : "secondary"}
          />
          <Button
            text="Extra active (very hard exercise/physical job)"
            onPress={() => setActivityLevel(1.9)}
            variant={activityLevel === 1.9 ? "primary" : "secondary"}
          />

          <Text style={styles.label}>Goal</Text>
          <Button text="Reduction" onPress={() => setGoal("reduction")} />
          <Button text="Maintenance" onPress={() => setGoal("maintenance")} />
          <Button text="Mass" onPress={() => setGoal("mass")} />

          <Button text="Back" onPress={() => setStep(1)} />
          <Button text="Submit" onPress={handleSubmit} />
        </View>
      </StepView>
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
      flexGrow: 1,
      backgroundColor: theme.background,
    },
    header: {
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      marginTop: 12,
    },
  });

export default NutritionSurveyScreen;
