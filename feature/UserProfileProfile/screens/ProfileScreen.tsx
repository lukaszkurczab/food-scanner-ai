import { useTheme } from "@/theme/useTheme";
import { auth } from "@/FirebaseConfig";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/navigate";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components";
import { useUserContext } from "@/context/UserContext";

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Profile"
>;

const ProfileScreen = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { userData } = useUserContext();

  const getActivityLevelLabel = (level: number) => {
    switch (level) {
      case 1.2:
        return "Sedentary";
      case 1.375:
        return "Lightly active";
      case 1.55:
        return "Moderately active";
      case 1.725:
        return "Very active";
      case 1.9:
        return "Extra active";
      default:
        return "Unknown";
    }
  };

  const renderBodyAndGoals = () => {
    if (userData && userData.nutritionSurvey.tdee) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Body & Goals</Text>
          <Text style={styles.value}>
            Goal: {userData.nutritionSurvey.goal}
          </Text>
          <Text style={styles.value}>
            Gender: {userData.nutritionSurvey.gender}
          </Text>
          <Text style={styles.value}>Age: {userData.nutritionSurvey.age}</Text>
          <Text style={styles.value}>
            Weight: {userData.nutritionSurvey.weight} kg
          </Text>
          <Text style={styles.value}>
            Height: {userData.nutritionSurvey.height} cm
          </Text>
          <Text style={styles.value}>
            Activity Level:{" "}
            {getActivityLevelLabel(userData.nutritionSurvey.activityLevel)}
          </Text>
          <Text style={styles.value}>
            BMR: {userData.nutritionSurvey.bmr}kcal
          </Text>
          <Text style={styles.value}>
            TDEE: {userData.nutritionSurvey.tdee}kcal
          </Text>
          <Text style={styles.value}>
            Goal TDEE: {userData.nutritionSurvey.adjustedTdee}kcal
          </Text>

          <Button
            text="Edit Body & Goals"
            onPress={() => navigation.navigate("NutritionSurvey")}
            style={styles.editButton}
          />
        </View>
      );
    } else {
      return (
        <Button
          text="Calculate Tdee"
          onPress={() => navigation.navigate("NutritionSurvey")}
        />
      );
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.header}>{userData?.username}</Text>

      {renderBodyAndGoals()}
      <Button
        text="Log out"
        onPress={() => auth().signOut()}
        style={styles.logoutButton}
      />
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 24,
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
    },
    value: {
      fontSize: 16,
      fontWeight: "400",
      marginBottom: 4,
      color: theme.textSecondary,
    },
    editButton: {
      marginTop: 12,
    },
    logoutButton: {
      marginTop: 12,
    },
  });

export default ProfileScreen;
