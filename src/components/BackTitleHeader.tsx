import { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import AppIcon, { type AppIconName } from "@/components/AppIcon";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";

type HeaderAction = {
  icon: AppIconName;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
};

export type BackTitleHeaderProps = {
  title: string;
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
  backAccessibilityLabel?: string;
  backButtonTestID?: string;
  trailingAction?: HeaderAction;
  titleSize?: "h1" | "h2";
};

export function BackTitleHeader({
  title,
  onBack,
  style,
  backAccessibilityLabel,
  backButtonTestID = "back-title-header-back",
  trailingAction,
  titleSize = "h1",
}: BackTitleHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={
          backAccessibilityLabel ?? t("common:back", { defaultValue: "Back" })
        }
        testID={backButtonTestID}
        style={({ pressed }) => [
          styles.iconButton,
          pressed ? styles.iconButtonPressed : null,
        ]}
      >
        <AppIcon name="arrow" size={24} color={theme.text} />
      </Pressable>

      <Text
        style={[styles.title, titleSize === "h2" ? styles.titleCompact : null]}
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>

      {trailingAction ? (
        <Pressable
          onPress={trailingAction.onPress}
          disabled={trailingAction.disabled}
          accessibilityRole="button"
          accessibilityLabel={trailingAction.accessibilityLabel}
          testID={trailingAction.testID}
          style={({ pressed }) => [
            styles.iconButton,
            pressed || trailingAction.disabled
              ? styles.iconButtonPressed
              : null,
          ]}
        >
          <AppIcon
            name={trailingAction.icon}
            size={20}
            color={
              trailingAction.disabled ? theme.textTertiary : theme.textSecondary
            }
          />
        </Pressable>
      ) : (
        <View style={styles.trailingSpacer} />
      )}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: -(theme.spacing.screenPadding + theme.spacing.sm),
      paddingHorizontal: theme.spacing.screenPaddingWide,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.background,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.rounded.md,
    },
    iconButtonPressed: {
      backgroundColor: theme.surfaceAlt,
    },
    title: {
      flex: 1,
      color: theme.text,
      fontSize: theme.typography.size.h1,
      lineHeight: theme.typography.lineHeight.h1,
      fontFamily: theme.typography.fontFamily.bold,
    },
    titleCompact: {
      fontSize: theme.typography.size.h2,
      lineHeight: theme.typography.lineHeight.h2,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    trailingSpacer: {
      width: 44,
      height: 44,
    },
  });

export default BackTitleHeader;
