import React from "react";
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
import { useTheme } from "@/src/theme/useTheme";
import { useRoute } from "@react-navigation/native";
import { ScrollView } from "react-native-gesture-handler";
import BottomTabBar from "@/src/components/BottomTabBar";

const hiddenRoutes = ["AvatarCamera"];

type LayoutProps = {
  children: React.ReactNode;
  showNavigation?: boolean;
};

export const Layout = ({ children, showNavigation = true }: LayoutProps) => {
  const theme = useTheme();
  const route = useRoute();

  const isCardVisible = !hiddenRoutes.includes(route.name);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, flexGrow: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.root, { backgroundColor: theme.background }]}>
          <View
            style={{
              maxHeight: Dimensions.get("window").height - 18,
            }}
          >
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
              {isCardVisible ? (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.card,
                      borderRadius: theme.rounded.lg,
                      margin: theme.spacing.lg,
                      padding: theme.spacing.lg,
                      justifyContent: "center",
                      paddingBottom: 62,
                      minHeight: Dimensions.get("window").height - 64,
                    },
                  ]}
                >
                  {children}
                </View>
              ) : (
                children
              )}
            </ScrollView>
          </View>
          {showNavigation && <BottomTabBar />}
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
