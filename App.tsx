import "@/i18n";
import "@/FirebaseConfig";
import "react-native-get-random-values";
import { useEffect } from "react";
import { ThemeController } from "@/theme/ThemeController";
import AppNavigator from "@/navigation/AppNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "@/navigation/navigate";
import { AuthProvider, useAuthContext } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { MealDraftProvider } from "@/context/MealDraftContext";
import { PremiumProvider } from "@/context/PremiumContext";
import { useFonts } from "expo-font";
import { View, ActivityIndicator, Platform } from "react-native";
import { useTheme } from "@/theme";
import { initRevenueCat } from "@/feature/Subscription";
import { InactivityProvider } from "@contexts/InactivityContext";
import { HistoryProvider } from "@/context/HistoryContext";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { reconcileAll } from "@/services/notifications/engine";
import { ensureAndroidChannel } from "@/services/notifications/localScheduler";
import { runSystemNotifications } from "@/services/notifications/system";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
} from "@react-native-firebase/firestore";

const TASK_NAME = "CALORIAI_NOTIFICATION_GUARD";

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const auth = require("@react-native-firebase/auth");
    const user = auth.default().currentUser;
    if (!user) return BackgroundTask.BackgroundTaskResult.Success;
    await reconcileAll(user.uid);
    await runSystemNotifications(user.uid);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

function useBootstrapNotifications() {
  const { uid } = useAuthContext();
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, []);
  useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync();
      if (Platform.OS === "android") {
        await ensureAndroidChannel();
      }
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const status = await BackgroundTask.getStatusAsync();
      if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
        return;
      }
      const tasks = await TaskManager.getRegisteredTasksAsync();
      const exists = tasks.find((t) => t.taskName === TASK_NAME);
      if (!exists) {
        await BackgroundTask.registerTaskAsync(TASK_NAME, {
          minimumInterval: 15, // minutes
        });
      }
    })();
  }, []);
  useEffect(() => {
    if (!uid) return;
    const db = getFirestore(getApp());
    const unsub = onSnapshot(
      collection(db, "users", uid, "notifications"),
      async () => {
        await reconcileAll(uid);
      }
    );
    return () => unsub();
  }, [uid]);
}

function Root() {
  useBootstrapNotifications();
  const theme = useTheme();
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("./assets/fonts/Inter-Medium.ttf"),
    "Inter-Bold": require("./assets/fonts/Inter-Bold.ttf"),
    "Inter-Light": require("./assets/fonts/Inter-Light.ttf"),
  });

  useEffect(() => {
    if (
      __DEV__ &&
      typeof (ErrorUtils as any)?.getGlobalHandler === "function"
    ) {
      const defaultHandler = (ErrorUtils as any).getGlobalHandler();
      (ErrorUtils as any).setGlobalHandler((error: any, isFatal: any) => {
        console.error("Global Error:", error);
        defaultHandler?.(error, isFatal);
      });
    }
    initRevenueCat();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <InactivityProvider>
        <PremiumProvider>
          <UserProvider>
            <MealDraftProvider>
              <HistoryProvider>
                <ThemeController>
                  <AppNavigator />
                </ThemeController>
              </HistoryProvider>
            </MealDraftProvider>
          </UserProvider>
        </PremiumProvider>
      </InactivityProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
