import React, { useMemo } from "react";
import { Modal, View, Pressable, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";

type ZoomModalProps = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

const ZoomModal: React.FC<ZoomModalProps> = ({ visible, uri, onClose }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
  };

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
    [scale, savedScale]
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
    [scale, translateX, translateY]
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
    [scale, savedScale]
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

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <GestureDetector gesture={composed}>
          <Animated.Image
            source={{ uri }}
            resizeMode="contain"
            style={[{ width: "100%", height: "100%" }, aStyle]}
          />
        </GestureDetector>

        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: Platform.select({ ios: 54, android: 24 }),
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
          hitSlop={12}
          accessibilityLabel="Zamknij podgląd"
        >
          <MaterialIcons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
};

export default ZoomModal;
