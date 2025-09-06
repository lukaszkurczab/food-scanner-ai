import React, { useEffect, useState } from "react";
import {
  StatusBar,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useRoute } from "@react-navigation/native";
import { ScrollView } from "react-native-gesture-handler";
import BottomTabBar from "@/components/BottomTabBar";
import { useInactivity } from "@contexts/InactivityContext";
import UserIcon from "./UserIcon";

const hiddenRoutes = [
  "AvatarCamera",
  "IngredientsNotRecognized",
  "MealCamera",
  "HistoryList",
  "SavedMeals",
  "SelectSavedMeal",
  "ReviewIngredients",
  "Result",
  "MealTextAI",
  "MealShare",
  "MealDetails",
];

type LayoutProps = {
  children: React.ReactNode;
  showNavigation?: boolean;
  disableScroll?: boolean;
};

export const Layout = ({
  children,
  showNavigation = true,
  disableScroll = false,
}: LayoutProps) => {
  const theme = useTheme();
  const route = useRoute();
  const { setScreenName } = useInactivity();

  const isCardVisible = !hiddenRoutes.includes(route.name);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    setScreenName(route.name);
  }, [route.name]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!isCardVisible) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, flexGrow: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {disableScroll ? (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              style={[styles.root, { backgroundColor: theme.background }]}
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.root,
                {
                  backgroundColor: theme.background,
                },
              ]}
            >
              {children}
            </View>
          )}
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, flexGrow: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.root, { backgroundColor: theme.background }]}>
          <View style={{ maxHeight: Dimensions.get("window").height - 18 }}>
            {disableScroll ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderRadius: theme.rounded.lg,
                    margin: theme.spacing.lg,
                    padding: theme.spacing.lg,
                    justifyContent: "center",
                    paddingBottom: showNavigation ? 62 : 32,
                    minHeight: Dimensions.get("window").height - 64,
                  },
                ]}
              >
                {children}
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  marginBottom: 16,
                }}
                keyboardShouldPersistTaps="handled"
              >
                <StatusBar
                  barStyle={
                    theme.mode === "dark" ? "light-content" : "dark-content"
                  }
                  backgroundColor={theme.background}
                />
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.card,
                      borderRadius: theme.rounded.lg,
                      margin: theme.spacing.lg,
                      padding: theme.spacing.lg,
                      justifyContent: "center",
                      paddingBottom: showNavigation ? 62 : 32,
                      minHeight: Dimensions.get("window").height - 64,
                    },
                  ]}
                >
                  {children}
                </View>
              </ScrollView>
            )}
          </View>
          {showNavigation && !isKeyboardVisible && isCardVisible && (
            <BottomTabBar
              renderProfileIcon={
                <UserIcon size={32} accessibilityLabel="Profile picture" />
              }
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
});
