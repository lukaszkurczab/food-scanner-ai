import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./navigate";
import { useAuthContext } from "@/context/AuthContext";

import HomeScreen from "@/feature/Home/screens/HomeScreen";
import ResultScreen from "@/feature/Meals/screens/ResultScreen";
import HistoryListScreen from "@/feature/History/screens/HistoryListScreen";
import StatisticsScreen from "@/feature/Statistics/screens/StatisticsScreen";
import LoginScreen from "@/feature/Auth/screens/LoginScreen";
import RegisterScreen from "@/feature/Auth/screens/RegisterScreen";
import MealAddMethodScreen from "@/feature/Meals/screens/MealAddMethodScreen";
import ReviewIngredientsScreen from "@/feature/Meals/screens/ReviewIngredientsScreen";
import ProfileScreen from "@/feature/UserProfile/screens/ProfileScreen";
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
import ManageSubscriptionScreen from "@/feature/UserProfile/screens/ManageSubscriptionScreen";
import MealCameraScreen from "@/feature/Meals/screens/MealCameraScreen";
import SavedMealsScreen from "@feature/History/screens/SavedMealsScreen";
import SelectSavedMealScreen from "@feature/Meals/screens/SelectSavedMealsScreen";
import IngredientsNotRecognizedScreen from "@/feature/Meals/screens/IngredientsNotRecognizedScreen";
import NotificationsScreen from "@/feature/UserProfile/screens/NotificationsScreen";
import NotificationFormScreen from "@/feature/UserProfile/screens/NotificationFormScreen";
import MealTextAIScreen from "@/feature/Meals/screens/MealTextAIScreen";

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SavedMeals" component={SavedMealsScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="AvatarCamera" component={AvatarCameraScreen} />
          <Stack.Screen name="HistoryList" component={HistoryListScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Statistics" component={StatisticsScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
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

          <Stack.Screen name="MealAddMethod" component={MealAddMethodScreen} />
          <Stack.Screen name="MealCamera" component={MealCameraScreen} />
          <Stack.Screen
            name="IngredientsNotRecognized"
            component={IngredientsNotRecognizedScreen}
          />
          <Stack.Screen
            name="ReviewIngredients"
            component={ReviewIngredientsScreen}
          />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen name="MealTextAI" component={MealTextAIScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen
            name="NotificationForm"
            component={NotificationFormScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="CheckMailbox" component={CheckMailboxScreen} />
        </>
      )}
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
