import React from "react";
import {
  StatusBar,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useRoute } from "@react-navigation/native";
import { ScrollView } from "react-native-gesture-handler";

const hiddenRoutes = ["Camera"];

export const Layout = ({ children }: { children: React.ReactNode }) => {
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
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
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
