import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type ProgressBarProps = {
  progress: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  style?: ViewStyle;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color,
  backgroundColor,
  height = 8,
  showLabel = false,
  label,
  style,
}) => {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const percent = Math.round(progress * 100);
  const fillColor = color || theme.accent;
  const trackColor = backgroundColor || theme.border;

  const minWidth = progress > 0 ? 5 : 0;

  return (
    <View style={style}>
      {showLabel && (
        <Text
          style={{
            color: theme.textSecondary,
            fontSize: theme.typography.size.sm,
            fontFamily: theme.typography.fontFamily.regular,
            marginBottom: 4,
            textAlign: "left",
          }}
        >
          {label ?? `${percent}%`}
        </Text>
      )}
      <View
        style={[
          styles.track,
          {
            backgroundColor: trackColor,
            borderRadius: theme.rounded.lg,
            height,
          },
        ]}
        onLayout={(e: LayoutChangeEvent) => {
          setTrackWidth(e.nativeEvent.layout.width);
        }}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Progress: ${percent}%`}
      >
        {trackWidth > 0 && (
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: fillColor,
                borderRadius: theme.rounded.lg,
                height,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [minWidth, trackWidth],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
});
