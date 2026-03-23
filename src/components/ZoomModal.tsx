import React, { useCallback, useMemo } from "react";
import { Modal, View, Pressable, Platform, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";

type ZoomModalProps = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

const ZoomModal: React.FC<ZoomModalProps> = ({ visible, uri, onClose }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const reset = useCallback(() => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
  }, [scale, savedScale, translateX, translateY]);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          savedScale.value = scale.value;
        })
        .onUpdate((e) => {
          const s = Math.max(1, Math.min(savedScale.value * e.scale, 6));
          scale.value = s;
        })
        .onEnd(() => {
          if (scale.value < 1) {
            reset();
          } else {
            savedScale.value = scale.value;
          }
        }),
    [reset, scale, savedScale]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          startX.value = translateX.value;
          startY.value = translateY.value;
        })
        .onUpdate((e) => {
          if (scale.value <= 1) return;
          translateX.value = startX.value + e.translationX;
          translateY.value = startY.value + e.translationY;
        })
        .onEnd(() => {
          translateX.value = withTiming(translateX.value);
          translateY.value = withTiming(translateY.value);
        }),
    [scale, startX, startY, translateX, translateY]
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          if (scale.value > 1) {
            reset();
          } else {
            scale.value = withTiming(2);
            savedScale.value = 2;
          }
        }),
    [reset, scale, savedScale]
  );

  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .maxDuration(180)
        .onEnd((_e, success) => {
          if (success) runOnJS(onClose)();
        }),
    [onClose]
  );

  const tapPriority = useMemo(
    () => Gesture.Exclusive(doubleTap, singleTap),
    [doubleTap, singleTap]
  );

  const composed = useMemo(
    () => Gesture.Simultaneous(tapPriority, pinch, pan),
    [tapPriority, pinch, pan]
  );

  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
  const closeButtonTopStyle = useMemo(
    () => ({ top: Platform.select({ ios: 54, android: 24 }) }),
    []
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <GestureDetector gesture={composed}>
          <Animated.Image
            source={{ uri }}
            resizeMode="contain"
            style={[styles.image, aStyle]}
          />
        </GestureDetector>

        <Pressable
          onPress={onClose}
          style={[styles.closeButton, closeButtonTopStyle]}
          hitSlop={12}
          accessibilityLabel="Zamknij podgląd"
        >
          <AppIcon name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
};

export default ZoomModal;

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.shadow,
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    closeButton: {
      position: "absolute",
      right: theme.spacing.md,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
