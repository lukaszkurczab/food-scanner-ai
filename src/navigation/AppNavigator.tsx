import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./navigate";
import { useAuthContext } from "@/src/context/AuthContext";

import HomeScreen from "@/src/feature/Home/screens/HomeScreen";
import ResultScreen from "@/src/feature/Meals/screens/ResultScreen";
import HistoryListScreen from "@/src/feature/History/screens/HistoryListScreen";
import MealDetailScreen from "@/src/feature/Statistics/MealDetailScreen";
import ChatScreen from "@/src/feature/AI/screens/ChatScreen";
import StatisticsScreen from "@/src/feature/Statistics/screens/StatisticsScreen";
import LoginScreen from "@/src/feature/Auth/screens/LoginScreen";
import RegisterScreen from "@/src/feature/Auth/screens/RegisterScreen";
import MealAddMethodScreen from "@/src/feature/Meals/screens/MealAddMethodScreen";
import AddMealFromList from "@/src/feature/AddMealFromList/screens/AddMealFromList";
import SavedMealsScreen from "@/src/feature/AddMealFromList/screens/SavedMealsScreen";
import ReviewIngredientsScreen from "@/src/feature/Meals/screens/ReviewIngredientsScreen";
import ProfileScreen from "@/src/feature/UserProfile/screens/ProfileScreen";
import TermsScreen from "@/src/feature/Auth/screens/TermsScreen";
import PrivacyScreen from "@/src/feature/Auth/screens/PrivacyScreen";
import ResetPasswordScreen from "@/src/feature/Auth/screens/ResetPasswordScreen";
import CheckMailboxScreen from "@/src/feature/Auth/screens/CheckMailboxScreen";
import OnboardingScreen from "@/src/feature/Onboarding/screens/OnboardingScreen";
import LoadingScreen from "@/src/screens/LoadingScreen";
import MealDetailsScreen from "@/src/feature/History/screens/MealDetailsScreen";
import EditUserDataScreen from "@/src/feature/UserProfile/screens/EditUserDataScreen";
import AvatarCameraScreen from "@/src/feature/UserProfile/screens/AvatarCameraScreen";
import UsernameChangeScreen from "@/src/feature/UserProfile/screens/UsernameChangeScreen";
import ChangeEmailScreen from "@/src/feature/UserProfile/screens/ChangeEmailScreen";
import ChangeEmailCheckMailboxScreen from "@/src/feature/UserProfile/screens/ChangeEmailCheckMailboxScreen";
import ChangePasswordScreen from "@/src/feature/UserProfile/screens/ChangePasswordScreen";
import LanguageScreen from "@/src/feature/UserProfile/screens/LanguageScreen";
import SendFeedbackScreen from "@/src/feature/UserProfile/screens/SendFeedbackScreen";
import ManageSubscriptionScreen from "@/src/feature/UserProfile/screens/ManageSubscriptionScreen";
import MealCameraScreen from "@/src/feature/Meals/screens/MealCameraScreen";
import IngredientsNotRecognizedScreen from "@/src/feature/Meals/screens/IngredientsNotRecognizedScreen";

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="AvatarCamera" component={AvatarCameraScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen name="HistoryList" component={HistoryListScreen} />
          <Stack.Screen name="SavedMeals" component={SavedMealsScreen} />
          <Stack.Screen name="MealDetail" component={MealDetailScreen} />
          <Stack.Screen name="AddMealFromList" component={AddMealFromList} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Statistics" component={StatisticsScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="MealCamera" component={MealCameraScreen} />
          <Stack.Screen
            name="IngredientsNotRecognized"
            component={IngredientsNotRecognizedScreen}
          />
          <Stack.Screen
            name="ReviewIngredients"
            component={ReviewIngredientsScreen}
          />
          <Stack.Screen name="EditUserData" component={EditUserDataScreen} />
          <Stack.Screen name="MealAddMethod" component={MealAddMethodScreen} />
          <Stack.Screen name="MealDetails" component={MealDetailsScreen} />
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
