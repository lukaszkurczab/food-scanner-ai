import { useEffect, useState, type ReactNode } from "react";
import {
  StatusBar,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { ScrollView } from "react-native-gesture-handler";
import BottomTabBar from "@/components/BottomTabBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useE2ENetInfo } from "@/services/e2e/connectivity";

type LayoutProps = {
  children: ReactNode;
  showNavigation?: boolean;
  disableScroll?: boolean;
  style?: StyleProp<ViewStyle>;
  showOfflineBanner?: boolean;
  keyboardAvoiding?: boolean;
};

const TAB_BAR_HEIGHT = 36;

export const Layout = ({
  children,
  showNavigation = true,
  disableScroll = false,
  style,
  showOfflineBanner = showNavigation,
  keyboardAvoiding = true,
}: LayoutProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const netInfo = useE2ENetInfo();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [offlineBannerHeight, setOfflineBannerHeight] = useState(0);

  useEffect(() => {
    const showEventName =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEventName =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEventName, () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEventName, () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const shouldShowTabBar = showNavigation && !isKeyboardVisible;
  const bottomPadding = shouldShowTabBar
    ? TAB_BAR_HEIGHT + insets.bottom + 8
    : isKeyboardVisible
      ? 0
      : insets.bottom + 8;
  const isOffline = netInfo.isConnected === false;
  const shouldShowOffline = showOfflineBanner && isOffline;
  const contentTopPadding = shouldShowOffline
    ? offlineBannerHeight + theme.spacing.sm
    : 0;

  useEffect(() => {
    if (!shouldShowOffline) {
      setOfflineBannerHeight(0);
    }
  }, [shouldShowOffline]);

  const content = (
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

        {shouldShowOffline && (
          <View
            pointerEvents="none"
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              if (nextHeight !== offlineBannerHeight) {
                setOfflineBannerHeight(nextHeight);
              }
            }}
            style={[
              styles.offlineBannerWrap,
              {
                top: insets.top + theme.spacing.sm,
                left: insets.left + theme.spacing.md,
                right: insets.right + theme.spacing.md,
              },
            ]}
          >
            <OfflineBanner compact style={styles.offlineBanner} />
          </View>
        )}

        {disableScroll ? (
          <View style={[styles.content, { paddingTop: contentTopPadding }]}>
            {children}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: contentTopPadding },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        )}

        {shouldShowTabBar && <BottomTabBar />}
      </View>
    </TouchableWithoutFeedback>
  );

  if (!keyboardAvoiding) {
    return content;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "height" : undefined}
      keyboardVerticalOffset={0}
    >
      {content}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  offlineBannerWrap: {
    position: "absolute",
    zIndex: 20,
    elevation: 4,
  },
  offlineBanner: { margin: 0 },
});
