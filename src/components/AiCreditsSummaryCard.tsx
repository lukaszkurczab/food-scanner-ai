import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { formatLocalDateTime } from "@/utils/formatLocalDateTime";

type AiCreditsSummaryCardProps = {
  balance: number | null;
  allocation: number | null;
  tier: "free" | "premium" | null;
  renewalAt?: string | null;
  loading?: boolean;
};

export function AiCreditsSummaryCard({
  balance,
  allocation,
  tier,
  renewalAt,
  loading = false,
}: AiCreditsSummaryCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation("profile");

  const renewalDate = formatLocalDateTime(renewalAt, {
    locale: i18n?.language,
  });
  const tierLabel =
    tier === "premium"
      ? t("manageSubscription.tierPremium")
      : tier === "free"
        ? t("manageSubscription.tierFree")
        : "-";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {t("manageSubscription.aiCreditsSection")}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsBalance")}
        </Text>
        <Text style={styles.value}>{loading ? "..." : (balance ?? "-")}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsAllocation")}
        </Text>
        <Text style={styles.value}>
          {loading ? "..." : (allocation ?? "-")}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsTier")}
        </Text>
        <Text style={styles.value}>{loading ? "..." : tierLabel}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsRenewalDate")}
        </Text>
        <Text style={styles.value}>
          {loading
            ? "..."
            : (renewalDate ??
              t("manageSubscription.aiCreditsRenewalUnknown"))}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
      shadowColor: "#000000",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
      flex: 1,
    },
    value: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "right",
      flexShrink: 0,
    },
  });
