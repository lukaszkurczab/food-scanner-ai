import React, {
  Children,
  isValidElement,
  useMemo,
  type ReactNode,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

export type SettingsSectionHeadingProps = {
  eyebrow?: string;
  title?: string;
  style?: StyleProp<ViewStyle>;
};

export type SettingsSectionProps = SettingsSectionHeadingProps & {
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function SettingsSectionHeading({
  eyebrow,
  title,
  style,
}: SettingsSectionHeadingProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!eyebrow && !title) {
    return null;
  }

  return (
    <View style={[styles.heading, style]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
    </View>
  );
}

export function SettingsSection({
  eyebrow,
  title,
  footer,
  children,
  style,
  contentStyle,
}: SettingsSectionProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const items = Children.toArray(children).filter(
    (child) => child !== null && child !== undefined,
  );

  return (
    <View style={[styles.section, style]}>
      <SettingsSectionHeading eyebrow={eyebrow} title={title} />

      <View style={[styles.group, contentStyle]}>
        {items.map((child, index) => {
          if (!isValidElement(child)) {
            return child;
          }

          const element = child as React.ReactElement<{ showDivider?: boolean }>;
          if (element.props.showDivider !== undefined) {
            return React.cloneElement(element, {
              key: element.key ?? `settings-section-item-${index}`,
            });
          }

          return React.cloneElement(element, {
            key: element.key ?? `settings-section-item-${index}`,
            showDivider: index < items.length - 1,
          });
        })}
      </View>

      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    section: {
      gap: theme.spacing.sm,
    },
    heading: {
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.xs,
    },
    eyebrow: {
      color: theme.textTertiary,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.overline,
      lineHeight: theme.typography.lineHeight.overline,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    title: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    group: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderSoft,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.surfaceElevated,
    },
    footer: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      paddingHorizontal: theme.spacing.xs,
    },
  });

export default SettingsSection;
