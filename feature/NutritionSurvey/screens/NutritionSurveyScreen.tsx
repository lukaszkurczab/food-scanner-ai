import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Keyboard } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Button, TextInput } from "../../../components";
import { StepView } from "../../../components/StepView";
import { RootStackParamList } from "../../../navigation/navigate";
import { useCalorieCalculator } from "../hooks/useCalorieCalculator";
import { auth, firestore } from "@/FirebaseConfig";
import { Gender, Goal, NutritionSurvey } from "../types/types";
import { useTheme } from "@/theme/useTheme";
import { saveNutritionSurvey } from "../utils/saveNutritionSurvey";
import { useUserContext } from "@/context/UserContext";

type NutritionSurveyNavigationProp = StackNavigationProp<
  RootStackParamList,
  "NutritionSurvey"
>;

const NutritionSurveyScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NutritionSurveyNavigationProp>();
  const [step, setStep] = useState(0);
  const { userData, loadingUserData, refreshUserData } = useUserContext();

  const [gender, setGender] = useState<Gender>(
    userData?.nutritionSurvey.gender || "male"
  );
  const [age, setAge] = useState(userData?.nutritionSurvey.age || 25);
  const [weight, setWeight] = useState(userData?.nutritionSurvey.weight || 70);
  const [height, setHeight] = useState(userData?.nutritionSurvey.height || 175);
  const [activityLevel, setActivityLevel] = useState(
    userData?.nutritionSurvey.activityLevel || 1.55
  );
  const [goal, setGoal] = useState<Goal>(
    userData?.nutritionSurvey.goal || "maintenance"
  );

  useEffect(() => {
    if (userData?.nutritionSurvey) {
      const survey = userData.nutritionSurvey;
      setGender(survey.gender);
      setAge(survey.age);
      setWeight(survey.weight);
      setHeight(survey.height);
      setActivityLevel(survey.activityLevel);
      setGoal(survey.goal);
    }
  }, [userData]);

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const input = { gender, age, weight, height, activityLevel, goal };
    const result = useCalorieCalculator(input);
    const data: NutritionSurvey = { ...input, ...result };

    const user = auth().currentUser;
    if (user) {
      await saveNutritionSurvey(user, data);
      await refreshUserData();
      navigation.navigate("Home");
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setStep(0);
    navigation.goBack();
  };

  const handleChangeStep = (newStep: number) => {
    Keyboard.dismiss();
    if (newStep < 0 || newStep > 2) return;
    setStep(newStep);
  };

  if (userData && userData.firstLogin) {
    firestore().collection("users").doc(userData.uid).update({
      firstLogin: false,
    });
  }

  if (loadingUserData || !userData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <StepView step={step} totalSteps={3}>
        <View>
          <Text style={styles.label}>Gender</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              text="Male"
              style={{ flex: 1 }}
              onPress={() => setGender("male")}
              variant={gender === "male" ? "primary" : "secondary"}
            />
            <Button
              text="Female"
              style={{ flex: 1 }}
              onPress={() => setGender("female")}
              variant={gender === "female" ? "primary" : "secondary"}
            />
          </View>

          <Text style={styles.label}>Age</Text>
          <TextInput
            keyboardType="numeric"
            value={age.toString()}
            onChange={(v) => setAge(Number(v))}
          />

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Button text="Cancel" style={{ flex: 1 }} onPress={handleCancel} />
            <Button
              text="Next"
              style={{ flex: 1 }}
              onPress={() => handleChangeStep(1)}
            />
          </View>
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

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Button
              text="Back"
              style={{ flex: 1 }}
              onPress={() => handleChangeStep(0)}
            />
            <Button
              text="Next"
              style={{ flex: 1 }}
              onPress={() => handleChangeStep(2)}
            />
          </View>
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
          <Button
            text="Reduction"
            onPress={() => setGoal("reduction")}
            variant={goal === "reduction" ? "primary" : "secondary"}
          />
          <Button
            text="Maintenance"
            onPress={() => setGoal("maintenance")}
            variant={goal === "maintenance" ? "primary" : "secondary"}
          />
          <Button
            text="Mass"
            onPress={() => setGoal("mass")}
            variant={goal === "mass" ? "primary" : "secondary"}
          />

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Button
              text="Back"
              style={{ flex: 1 }}
              onPress={() => handleChangeStep(1)}
            />
            <Button text="Submit" style={{ flex: 1 }} onPress={handleSubmit} />
          </View>
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
