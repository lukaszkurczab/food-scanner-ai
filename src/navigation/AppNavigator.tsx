import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./navigate";
import { useAuthContext } from "@/src/context/AuthContext";

import HomeScreen from "@/src/feature/Home/screens/HomeScreen";
import ResultScreen from "@/src/feature/AddMealAI/screens/ResultScreen";
import HistoryScreen from "@/src/feature/History/screens/HistoryScreen";
import MealDetailScreen from "@/src/feature/Meals/screens/MealDetailScreen";
import ChatScreen from "@/src/feature/AI/screens/ChatScreen";
import SummaryScreen from "@/src/feature/Statistics/screens/SummaryScreen";
import LoginScreen from "@/src/feature/Auth/screens/LoginScreen";
import RegisterScreen from "@/src/feature/Auth/screens/RegisterScreen";
import MealAddMethodScreen from "@/src/feature/Meals/screens/MealAddMethodScreen";
import AddMealFromList from "@/src/feature/AddMealFromList/screens/AddMealFromList";
import SavedMealsScreen from "@/src/feature/AddMealFromList/screens/SavedMealsScreen";
import AddMealManual from "@/src/feature/AddMealManual/screens/AddMealManual";
import ReviewIngredientsScreen from "@/src/feature/AddMealAI/screens/ReviewIngredientsScreen";
import ProfileScreen from "@/src/feature/UserProfile/screens/ProfileScreen";
import TermsScreen from "@/src/feature/Auth/screens/TermsScreen";
import PrivacyScreen from "@/src/feature/Auth/screens/PrivacyScreen";
import ResetPasswordScreen from "@/src/feature/Auth/screens/ResetPasswordScreen";
import CheckMailboxScreen from "@/src/feature/Auth/screens/CheckMailboxScreen";
import OnboardingScreen from "@/src/feature/Onboarding/screens/OnboardingScreen";
import LoadingScreen from "@/src/screens/LoadingScreen";
import EditUserDataScreen from "@/src/feature/UserProfile/screens/EditUserDataScreen";
import AvatarCameraScreen from "@/src/feature/UserProfile/screens/AvatarCameraScreen";
import UsernameChangeScreen from "@/src/feature/UserProfile/screens/UsernameChangeScreen";

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
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="SavedMeals" component={SavedMealsScreen} />
          <Stack.Screen name="MealDetail" component={MealDetailScreen} />
          <Stack.Screen name="AddMealFromList" component={AddMealFromList} />
          <Stack.Screen name="AddMealManual" component={AddMealManual} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Summary" component={SummaryScreen} />
          <Stack.Screen
            name="ReviewIngredients"
            component={ReviewIngredientsScreen}
          />
          <Stack.Screen name="EditUserData" component={EditUserDataScreen} />
          <Stack.Screen name="MealAddMethod" component={MealAddMethodScreen} />
          <Stack.Screen
            name="UsernameChange"
            component={UsernameChangeScreen}
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
