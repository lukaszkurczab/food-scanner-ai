import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  I18nManager,
  Animated,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type SliderProps = {
  value: number;
  onValueChange: (val: number) => void;
  onSlidingComplete?: (val: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  minimumLabel?: string;
  maximumLabel?: string;
  unit?: string;
};

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  onSlidingComplete,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  disabled = false,
  minimumLabel,
  maximumLabel,
  unit,
}) => {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const thumbAnim = useRef(new Animated.Value(0)).current;

  const getPercent = (v: number) =>
    Math.max(
      0,
      Math.min(1, (v - minimumValue) / (maximumValue - minimumValue))
    );
  const percent = getPercent(value);

  // Wyliczamy rzeczywiste położenie thumb w px
  const thumbPosition = width * percent;

  // Obsługa dragowania
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        setDragging(true);
        thumbAnim.setValue(1);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!width) return;
        let dx = I18nManager.isRTL ? -gestureState.dx : gestureState.dx;

        const newX = Math.max(0, Math.min(width, thumbPosition + dx));
        const newPercent = newX / width;
        let newValue =
          minimumValue +
          Math.round(((maximumValue - minimumValue) * newPercent) / step) *
            step;
        newValue = Math.max(minimumValue, Math.min(newValue, maximumValue));
        if (newValue !== value) {
          onValueChange(newValue);
        }
      },
      onPanResponderRelease: () => {
        setDragging(false);
        Animated.spring(thumbAnim, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        if (onSlidingComplete) onSlidingComplete(value);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.spring(thumbAnim, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const trackBg = disabled ? theme.disabled.background : theme.border;
  const fillColor = disabled ? theme.disabled.background : theme.accent;
  const thumbColor = disabled ? theme.disabled.text : theme.accent;
  const thumbBorder = theme.background;
  const labelColor = disabled ? theme.disabled.text : theme.textSecondary;
  const bubbleBg = theme.card;

  const thumbSize = thumbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 26],
  });

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <View style={styles.labelsSpacer} />
        <View style={styles.valueBubbleContainer}>
          <View
            style={[
              styles.valueBubble,
              {
                backgroundColor: bubbleBg,
                borderRadius: theme.rounded.sm,
              },
            ]}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: theme.typography.size.sm,
                fontFamily: theme.typography.fontFamily.medium,
              }}
            >
              {value}
              {unit ? ` ${unit}` : ""}
            </Text>
          </View>
        </View>
        <View style={styles.labelsSpacer} />
      </View>
      <View
        style={styles.sliderRow}
        onLayout={onTrackLayout}
        pointerEvents={disabled ? "none" : "auto"}
      >
        <View
          style={[
            styles.track,
            {
              backgroundColor: trackBg,
              borderRadius: theme.rounded.full,
            },
          ]}
        >
          <View
            style={[
              styles.filled,
              {
                backgroundColor: fillColor,
                width: width * percent,
                borderRadius: theme.rounded.full,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.thumb,
              {
                left: Math.max(0, width * percent - 10),
                backgroundColor: thumbColor,
                borderColor: thumbBorder,
                width: thumbSize,
                height: thumbSize,
                shadowColor: theme.shadow,
                shadowOpacity: 0.16,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 2 },
                opacity: disabled ? 0.5 : 1,
              },
            ]}
            {...panResponder.panHandlers}
          />
        </View>
      </View>
      {(minimumLabel || maximumLabel) && (
        <View style={styles.labelsRow}>
          <Text
            style={{
              color: labelColor,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.regular,
            }}
          >
            {minimumLabel || ""}
          </Text>
          <Text
            style={{
              color: labelColor,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.regular,
            }}
          >
            {maximumLabel || ""}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 56,
    justifyContent: "center",
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
    minHeight: 24,
  },
  valueBubbleContainer: {
    flex: 0,
    minWidth: 48,
    alignItems: "center",
  },
  valueBubble: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: "center",
    minWidth: 40,
    minHeight: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  labelsSpacer: {
    flex: 1,
  },
  sliderRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 0,
  },
  track: {
    width: "100%",
    height: 6,
    justifyContent: "center",
  },
  filled: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 6,
  },
  thumb: {
    position: "absolute",
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    zIndex: 10,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
