import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type ListItemProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactElement<{ size?: number; color?: string }>;
  value?: string | number | React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  value,
  onPress,
  selected = false,
  disabled = false,
  style,
}) => {
  const theme = useTheme();

  const isClickable = !!onPress && !disabled;
  const isSelected = !!selected;
  const colorTitle = disabled
    ? theme.disabled.text
    : isSelected
    ? theme.accent
    : theme.text;
  const colorSubtitle = disabled ? theme.disabled.text : theme.textSecondary;
  const iconColor = disabled
    ? theme.disabled.text
    : isSelected
    ? theme.accent
    : theme.textSecondary;
  const rightColor = disabled ? theme.disabled.text : theme.textSecondary;

  const backgroundColor = isSelected ? theme.card : "transparent";

  const renderRight = () => {
    if (isSelected)
      return <MaterialIcons name="check" size={24} color={theme.accent} />;
    if (value !== undefined && value !== null) {
      if (typeof value === "string" || typeof value === "number") {
        return (
          <Text
            style={{
              color: rightColor,
              fontSize: theme.typography.size.base,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {value}
          </Text>
        );
      }
      return value;
    }
    if (isClickable)
      return (
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={theme.textSecondary}
        />
      );
    return null;
  };

  const Content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderRadius: theme.rounded.md,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {icon && (
        <View style={[styles.iconBox, { marginRight: theme.spacing.md }]}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon, {
                size: icon.props.size || 24,
                color: icon.props.color || iconColor,
              })
            : icon}
        </View>
      )}
      <View style={styles.textContainer}>
        <Text
          numberOfLines={1}
          style={{
            color: colorTitle,
            fontSize: theme.typography.size.base,
            fontFamily: theme.typography.fontFamily.medium,
            fontWeight: "500",
          }}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            numberOfLines={2}
            style={{
              color: colorSubtitle,
              fontSize: theme.typography.size.sm,
              fontFamily: theme.typography.fontFamily.regular,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.right}>{renderRight()}</View>
    </View>
  );

  if (isClickable) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={onPress}
        disabled={disabled}
        android_ripple={{ color: theme.overlay }}
      >
        {Content}
      </Pressable>
    );
  }

  return Content;
};

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: "100%",
  },
  iconBox: {
    justifyContent: "center",
    alignItems: "center",
    width: 32,
    height: 32,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
  },
  right: {
    minWidth: 32,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },
});
