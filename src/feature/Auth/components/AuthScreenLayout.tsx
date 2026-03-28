import { useMemo, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Layout } from "@/components";
import { useTheme } from "@/theme/useTheme";

type AuthScreenLayoutProps = {
  title: string;
  subtitle?: string;
  heroVariant?: "default" | "compact";
  banner?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthScreenLayout({
  title,
  subtitle,
  heroVariant = "default",
  banner,
  footer,
  children,
}: AuthScreenLayoutProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Layout showNavigation={false} style={styles.layout}>
      <View style={styles.container}>
        <View style={styles.main}>
          {banner ? <View style={styles.banner}>{banner}</View> : null}

          <View
            style={[
              styles.hero,
              heroVariant === "compact"
                ? styles.heroCompact
                : styles.heroDefault,
            ]}
          >
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.form}>{children}</View>
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingLeft: theme.spacing.screenPadding,
      paddingRight: theme.spacing.screenPadding,
      flex: 1,
    },
    container: {
      flexGrow: 1,
      justifyContent: "space-between",
    },
    main: {
      flexGrow: 1,
    },
    banner: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    hero: {
      alignItems: "center",
    },
    heroDefault: {
      paddingTop: theme.spacing.hero,
      paddingBottom: theme.spacing.xxl,
    },
    heroCompact: {
      paddingTop: theme.spacing.xxxl,
      paddingBottom: theme.spacing.xl,
    },
    title: {
      color: theme.primary,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.displayM,
      lineHeight: theme.typography.lineHeight.displayM,
      textAlign: "center",
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      textAlign: "center",
    },
    form: {
      width: "100%",
      flex: 1,
    },
    footer: {
      paddingTop: theme.spacing.sectionGapLarge,
      paddingBottom: theme.spacing.xl,
    },
  });
