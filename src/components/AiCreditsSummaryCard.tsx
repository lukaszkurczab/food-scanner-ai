import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";

type AiCreditsSummaryCardProps = {
  balance: number | null;
  allocation: number | null;
  tier: "free" | "premium" | null;
  renewalAt?: string | null;
  loading?: boolean;
};

function formatRenewalDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function AiCreditsSummaryCard({
  balance,
  allocation,
  tier,
  renewalAt,
  loading = false,
}: AiCreditsSummaryCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("profile");

  const renewalDate = formatRenewalDate(renewalAt);
  const tierLabel =
    tier === "premium"
      ? t("manageSubscription.tierPremium", { defaultValue: "Premium" })
      : tier === "free"
        ? t("manageSubscription.tierFree", { defaultValue: "Free" })
        : "-";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {t("manageSubscription.aiCreditsSection", {
          defaultValue: "AI Credits",
        })}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsBalance", { defaultValue: "Balance" })}
        </Text>
        <Text style={styles.value}>
          {loading ? "..." : balance ?? "-"}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsAllocation", {
            defaultValue: "Allocation",
          })}
        </Text>
        <Text style={styles.value}>
          {loading ? "..." : allocation ?? "-"}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsTier", { defaultValue: "Tier" })}
        </Text>
        <Text style={styles.value}>
          {loading ? "..." : tierLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("manageSubscription.aiCreditsRenewalDate", {
            defaultValue: "Renews on",
          })}
        </Text>
        <Text style={styles.value}>
          {loading
            ? "..."
            : renewalDate ??
              t("manageSubscription.aiCreditsRenewalUnknown", {
                defaultValue: "Unavailable",
              })}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xl,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.medium,
    },
    value: {
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.bold,
    },
  });
