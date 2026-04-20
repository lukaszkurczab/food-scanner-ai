import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import AppIcon, { type AppIconName } from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";

type CornerIcon = "back" | "close";

type Props = {
  icon: CornerIcon;
  onPress: () => void;
  accessibilityLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
};

const iconMap: Record<
  CornerIcon,
  { name: AppIconName; rotation?: `${number}deg` }
> = {
  back: { name: "arrow" },
  close: { name: "close" },
};

export function ScreenCornerNavButton({
  icon,
  onPress,
  accessibilityLabel,
  containerStyle,
  disabled = false,
  testID,
}: Props) {
  const theme = useTheme();
  const resolvedIcon = iconMap[icon];

  return (
    <Pressable
      testID={testID ?? "screen-corner-button"}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        {
          top: theme.spacing.xs,
          right: 0,
          backgroundColor:
            disabled || pressed ? theme.surfaceAlt : theme.surfaceElevated,
          borderColor: theme.border,
        },
        containerStyle,
      ]}
    >
      <AppIcon
        name={resolvedIcon.name}
        rotation={resolvedIcon.rotation}
        size={20}
        color={disabled ? theme.textTertiary : theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    zIndex: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
