import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./navigate";
import { useAuthContext } from "@/context/AuthContext";

import HomeScreen from "../feature/Home/screens/HomeScreen";
import CameraScreen from "@/feature/AddMealAI/screens/CameraScreen";
import ResultScreen from "../screens/ResultScreen";
import HistoryScreen from "../screens/HistoryScreen";
import MealDetailScreen from "../screens/MealDetailScreen";
import ChatScreen from "../screens/ChatScreen";
import SummaryScreen from "../screens/SummaryScreen";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import MealAddMethodScreen from "@//screens/MealAddMethodScreen";
import AddMealFromList from "@/feature/AddMealFromList/screens/AddMealFromList";
import AddMealManual from "@/feature/AddMealManual/screens/AddMealManual";

import { Layout } from "../components";
import { View, ActivityIndicator } from "react-native";
import NutritionSurveyScreen from "@/feature/NutritionSurvey/screens/NutritionSurveyScreen";
import ProfileScreen from "@/feature/UserProfileProfile/screens/ProfileScreen";

const Stack = createStackNavigator<RootStackParamList>();

const withLayout = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <Layout>
      <Component {...props} />
    </Layout>
  );
};

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
          <Stack.Screen name="Home" component={withLayout(HomeScreen)} />
          <Stack.Screen name="Camera" component={CameraScreen} />
          <Stack.Screen name="Result" component={withLayout(ResultScreen)} />
          <Stack.Screen name="History" component={withLayout(HistoryScreen)} />
          <Stack.Screen
            name="MealDetail"
            component={withLayout(MealDetailScreen)}
          />
          <Stack.Screen
            name="AddMealFromList"
            component={withLayout(AddMealFromList)}
          />
          <Stack.Screen
            name="AddMealManual"
            component={withLayout(AddMealManual)}
          />
          <Stack.Screen name="Profile" component={withLayout(ProfileScreen)} />
          <Stack.Screen name="Chat" component={withLayout(ChatScreen)} />
          <Stack.Screen name="Summary" component={withLayout(SummaryScreen)} />
          <Stack.Screen
            name="NutritionSurvey"
            component={NutritionSurveyScreen}
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
