import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./navigate";

import HomeScreen from "../screens/HomeScreen/HomeScreen";
import CameraScreen from "../screens/CameraScreen/CameraScreen";
import ResultScreen from "../screens/ResultScreen/ResultScreen";
import HistoryScreen from "../screens/HistoryScreen/HistoryScreen";
import MealDetailScreen from "../screens/MealDetailScreen/MealDetailScreen";
import ChatScreen from "../screens/ChatScreen/ChatScreen";
import SummaryScreen from "../screens/SummaryScreen/SummaryScreen";

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="MealDetail" component={MealDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
