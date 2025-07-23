import React from "react";
import { View, ViewStyle } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Props = {
  step: number;
  total: number;
  style?: ViewStyle;
};

const DOT_SIZE = 12;
const DOT_SPACING = 12;

const ProgressDots: React.FC<Props> = ({ step, total, style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          marginBottom: theme.spacing.lg,
          gap: DOT_SPACING,
        },
        style,
      ]}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flexGrow: 1,
            height: DOT_SIZE,
            borderRadius: theme.rounded.full,
            backgroundColor:
              i + 1 <= step ? theme.accentSecondary : theme.textSecondary,
            opacity: i + 1 === step ? 1 : 0.6,
          }}
        />
      ))}
    </View>
  );
};

export default ProgressDots;
