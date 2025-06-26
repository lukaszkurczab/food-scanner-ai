import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./navigate";

import HomeScreen from "../screens/HomeScreen";
import CameraScreen from "../screens/CameraScreen";
import ResultScreen from "../screens/ResultScreen";
import HistoryScreen from "../screens/HistoryScreen";
import MealDetailScreen from "../screens/MealDetailScreen";
import ChatScreen from "../screens/ChatScreen";
import SummaryScreen from "../screens/SummaryScreen";
import AuthLoadingScreen from "@/screens/AuthLoadingScreen";
import LoginScreen from "@/screens/LoginScreen";
import AuthLoadingScreen from "@/screens/AuthLoadingScreen";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";

import { Layout } from "../components";

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
  return (
    <Stack.Navigator
      initialRouteName="AuthLoading"
      initialRouteName="AuthLoading"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="MealDetail" component={MealDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
      <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />

      <Stack.Screen name="Home" component={withLayout(HomeScreen)} />
      <Stack.Screen name="Camera" component={withLayout(CameraScreen)} />
      <Stack.Screen name="Result" component={withLayout(ResultScreen)} />
      <Stack.Screen name="History" component={withLayout(HistoryScreen)} />
      <Stack.Screen
        name="MealDetail"
        component={withLayout(MealDetailScreen)}
      />
      <Stack.Screen name="Chat" component={withLayout(ChatScreen)} />
      <Stack.Screen name="Summary" component={withLayout(SummaryScreen)} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
