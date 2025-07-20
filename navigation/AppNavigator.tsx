import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./navigate";
import { useAuthContext } from "@contexts/AuthContext";

import HomeScreen from "@feature/Home/screens/HomeScreen";
import CameraScreen from "@feature/AddMealAI/screens/CameraScreen";
import ResultScreen from "@feature/AddMealAI/screens/ResultScreen";
import HistoryScreen from "@feature/History/screens/HistoryScreen";
import MealDetailScreen from "@feature/Meals/screens/MealDetailScreen";
import ChatScreen from "@feature/AI/screens/ChatScreen";
import SummaryScreen from "@feature/Statistics/screens/SummaryScreen";
import LoginScreen from "@feature/Auth/screens/LoginScreen";
import RegisterScreen from "@feature/Auth/screens/RegisterScreen";
import MealAddMethodScreen from "@feature/Meals/screens/MealAddMethodScreen";
import AddMealFromList from "@feature/AddMealFromList/screens/AddMealFromList";
import SavedMealsScreen from "@feature/AddMealFromList/screens/SavedMealsScreen";
import AddMealManual from "@feature/AddMealManual/screens/AddMealManual";
import ReviewIngredientsScreen from "@feature/AddMealAI/screens/ReviewIngredientsScreen";
import NutritionSurveyScreen from "@feature/NutritionSurvey/screens/NutritionSurveyScreen";
import ProfileScreen from "@feature/UserProfile/screens/ProfileScreen";

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
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Camera" component={CameraScreen} />
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
            name="NutritionSurvey"
            component={NutritionSurveyScreen}
          />
          <Stack.Screen
            name="ReviewIngredients"
            component={ReviewIngredientsScreen}
          />
          <Stack.Screen name="MealAddMethod" component={MealAddMethodScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
