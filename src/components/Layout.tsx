import React, { useEffect, useState } from "react";
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
import BottomTabBar from "@/components/BottomTabBar";
import { useInactivity } from "@contexts/InactivityContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LayoutProps = {
  children: React.ReactNode;
  showNavigation?: boolean;
  disableScroll?: boolean;
  style?: any;
};

const TAB_BAR_HEIGHT = 36;

export const Layout = ({
  children,
  showNavigation = true,
  disableScroll = false,
  style,
}: LayoutProps) => {
  const theme = useTheme();
  const route = useRoute();
  const { setScreenName } = useInactivity();
  const insets = useSafeAreaInsets();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    setScreenName(route.name);
  }, [route.name]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const shouldShowTabBar = showNavigation && !isKeyboardVisible;
  const bottomPadding = shouldShowTabBar
    ? TAB_BAR_HEIGHT + insets.bottom
    : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View
          style={[
            styles.root,
            {
              backgroundColor: theme.background,
              paddingTop: insets.top + 16,
              paddingBottom: bottomPadding,
              paddingLeft: insets.left + 32,
              paddingRight: insets.right + 32,
            },
            style,
          ]}
        >
          <StatusBar
            barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
            backgroundColor={theme.background}
          />

          {disableScroll ? (
            <View style={styles.content}>{children}</View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          )}

          {shouldShowTabBar && <BottomTabBar />}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
