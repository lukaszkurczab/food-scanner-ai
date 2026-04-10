import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import AppIcon, { type AppIconName } from "@/components/AppIcon";
import { Button } from "@/components/Button";

export type EmptyStateProps = {
  icon?: AppIconName;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
};

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      {icon && (
        <AppIcon
          name={icon}
          size={48}
          color={theme.textTertiary}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.title,
          {
            color: theme.text,
            fontFamily: theme.typography.fontFamily.semiBold,
            fontSize: theme.typography.size.bodyL,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.textSecondary,
              fontFamily: theme.typography.fontFamily.regular,
              fontSize: theme.typography.size.bodyS,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
      {action && (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          fullWidth={false}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  icon: { marginBottom: 8 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center" },
  action: { marginTop: 16 },
});

export default EmptyState;
