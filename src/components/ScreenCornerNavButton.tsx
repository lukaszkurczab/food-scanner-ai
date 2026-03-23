import type { StyleProp, ViewStyle } from "react-native";
import { View, StyleSheet } from "react-native";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";
import { IconButton } from "./IconButton";

type CornerIcon = "back" | "close";

type Props = {
  icon: CornerIcon;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: "default" | "camera";
  containerStyle?: StyleProp<ViewStyle>;
};

const iconMap: Record<CornerIcon, "arrow-left" | "close"> = {
  back: "arrow-left",
  close: "close",
};

export function ScreenCornerNavButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = "default",
  containerStyle,
}: Props) {
  const theme = useTheme();
  const isCameraTone = tone === "camera";

  return (
    <View
      style={[
        styles.container,
        {
          top: theme.spacing.md,
          left: theme.spacing.md,
        },
        containerStyle,
      ]}
    >
      <IconButton
        icon={<AppIcon name={iconMap[icon]} />}
        onPress={onPress}
        size={44}
        accessibilityLabel={accessibilityLabel}
        backgroundColor={isCameraTone ? "rgba(0,0,0,0.45)" : undefined}
        iconColor={isCameraTone ? "#fff" : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 20,
  },
});
