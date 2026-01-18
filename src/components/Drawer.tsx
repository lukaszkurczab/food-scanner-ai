import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  open: boolean;
  onClose: () => void;
  width?: number; // px
  children: React.ReactNode;
};

export function Drawer({ open, onClose, width, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screenW = Dimensions.get("window").width;
  const w = useMemo(
    () => Math.min(width ?? 320, screenW * 0.86),
    [width, screenW]
  );

  const x = useRef(new Animated.Value(-w)).current;

  useEffect(() => {
    Animated.timing(x, {
      toValue: open ? 0 : -w,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, w, x]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Pressable
          style={[
            styles.backdrop,
            { backgroundColor: theme.background ?? "rgba(0,0,0,0.45)" },
          ]}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.panel,
            {
              width: w,
              transform: [{ translateX: x }],
              backgroundColor: theme.background,
              borderRightColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    flex: 1,
    borderRightWidth: 1,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 8, height: 0 },
    elevation: 6,
  },
});
