import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import type { RootStackParamList } from "./navigate";
import { useAuthContext } from "@/context/AuthContext";
import HomeScreen from "@/feature/Home/screens/HomeScreen";
import WeeklyReportScreen from "@/feature/Home/screens/WeeklyReportScreen";
import HistoryListScreen from "@/feature/History/screens/HistoryListScreen";
import StatisticsScreen from "@/feature/Statistics/screens/StatisticsScreen";
import LoginScreen from "@/feature/Auth/screens/LoginScreen";
import RegisterScreen from "@/feature/Auth/screens/RegisterScreen";
import MealAddMethodScreen from "@/feature/Meals/screens/MealAddMethodScreen";
import ProfileScreen from "@feature/UserProfile/screens/UserProfileScreen";
import TermsScreen from "@/feature/Auth/screens/TermsScreen";
import PrivacyScreen from "@/feature/Auth/screens/PrivacyScreen";
import ResetPasswordScreen from "@/feature/Auth/screens/ResetPasswordScreen";
import CheckMailboxScreen from "@/feature/Auth/screens/CheckMailboxScreen";
import OnboardingScreen from "@/feature/Onboarding/screens/OnboardingScreen";
import LoadingScreen from "@/screens/LoadingScreen";
import MealDetailsScreen from "@/feature/History/screens/MealDetailsScreen";
import EditUserDataScreen from "@/feature/UserProfile/screens/EditUserDataScreen";
import AvatarCameraScreen from "@/feature/UserProfile/screens/AvatarCameraScreen";
import UsernameChangeScreen from "@/feature/UserProfile/screens/UsernameChangeScreen";
import ChangeEmailScreen from "@/feature/UserProfile/screens/ChangeEmailScreen";
import ChangeEmailCheckMailboxScreen from "@/feature/UserProfile/screens/ChangeEmailCheckMailboxScreen";
import ChangePasswordScreen from "@/feature/UserProfile/screens/ChangePasswordScreen";
import LanguageScreen from "@/feature/UserProfile/screens/LanguageScreen";
import SendFeedbackScreen from "@/feature/UserProfile/screens/SendFeedbackScreen";
import ManageSubscriptionScreen from "@/feature/Subscription/screens/ManageSubscriptionScreen";
import SavedMealsScreen from "@/feature/History/screens/SavedMealsScreen";
import SelectSavedMealScreen from "@/feature/Meals/screens/SelectSavedMealsScreen";
import NotificationsScreen from "@/feature/UserProfile/screens/NotificationsScreen";
import NotificationFormScreen from "@/feature/UserProfile/screens/NotificationFormScreen";
import MealTextAIScreen from "@/feature/Meals/screens/MealTextAIScreen";
import MealShareScreen from "@/feature/Meals/screens/MealShareScreen";
import ChatScreen from "@/feature/AI/screens/ChatScreen";
import EditReviewIngredientsScreen from "@/feature/History/screens/EditReviewIngredientsScreen";
import EditResultScreen from "@/feature/History/screens/EditResultScreen";
import SavedMealsCameraScreen from "@/feature/History/screens/SavedMealsCameraScreen";
import AddMealScreen from "@feature/Meals/screens/AddMealScreen";
import { isE2EModeEnabled } from "@/services/e2e/config";

const Stack = createStackNavigator<RootStackParamList>();

function renderAuthScreens() {
  return (
    <>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="CheckMailbox" component={CheckMailboxScreen} />
    </>
  );
}

function renderAppScreens() {
  return (
    <>
      <Stack.Screen name="Loading" component={LoadingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
      <Stack.Screen name="SavedMeals" component={SavedMealsScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="AvatarCamera" component={AvatarCameraScreen} />
      <Stack.Screen name="HistoryList" component={HistoryListScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="EditUserData" component={EditUserDataScreen} />
      <Stack.Screen name="MealDetails" component={MealDetailsScreen} />
      <Stack.Screen
        name="SelectSavedMeal"
        component={SelectSavedMealScreen}
      />
      <Stack.Screen
        name="UsernameChange"
        component={UsernameChangeScreen}
      />
      <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
      <Stack.Screen
        name="ChangeEmailCheckMailbox"
        component={ChangeEmailCheckMailboxScreen}
      />
      <Stack.Screen
        name="ManageSubscription"
        component={ManageSubscriptionScreen}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
      />
      <Stack.Screen name="SendFeedback" component={SendFeedbackScreen} />
      <Stack.Screen
        name="MealAddMethod"
        component={MealAddMethodScreen}
        options={{
          presentation: "transparentModal",
          cardStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="AddMeal" component={AddMealScreen} />
      <Stack.Screen
        name="SavedMealsCamera"
        component={SavedMealsCameraScreen}
      />
      <Stack.Screen
        name="EditReviewIngredients"
        component={EditReviewIngredientsScreen}
      />
      <Stack.Screen name="EditResult" component={EditResultScreen} />
      <Stack.Screen name="MealTextAI" component={MealTextAIScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="NotificationForm"
        component={NotificationFormScreen}
      />
      <Stack.Screen name="MealShare" component={MealShareScreen} />
    </>
  );
}

function renderSharedScreens() {
  return (
    <>
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuthContext();
  const disableAnimations = isE2EModeEnabled();

  if (loading) {
    return (
      <View style={styles.centerBoth}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: disableAnimations ? "none" : "default",
      }}
    >
      {isAuthenticated ? renderAppScreens() : renderAuthScreens()}
      {renderSharedScreens()}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centerBoth: { flex: 1, justifyContent: "center", alignItems: "center" },
});
