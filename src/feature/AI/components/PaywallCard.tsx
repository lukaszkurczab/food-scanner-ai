import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import Purchases from "react-native-purchases";
import type { PurchasesPackage } from "react-native-purchases";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { restorePurchases } from "@/services/billing/purchase";

type Props = {
  used: number;
  limit: number;
  onUpgrade?: () => void;
};

type PriceInfo = {
  priceText: string | null;
  periodText: string | null;
};

type ExtraConfig = {
  disableBilling?: boolean;
  termsUrl?: string;
  privacyUrl?: string;
};

function getExtraConfig(): ExtraConfig {
  const raw = Constants.expoConfig?.extra;
  if (!raw || typeof raw !== "object") return {};
  const extra = raw as Record<string, unknown>;
  return {
    disableBilling:
      typeof extra.disableBilling === "boolean" ? extra.disableBilling : undefined,
    termsUrl: typeof extra.termsUrl === "string" ? extra.termsUrl : undefined,
    privacyUrl: typeof extra.privacyUrl === "string" ? extra.privacyUrl : undefined,
  };
}

function billingDisabled(): boolean {
  const extra = getExtraConfig();
  return !!extra.disableBilling || !Device.isDevice;
}

function packagePeriodLabel(p: PurchasesPackage): string | null {
  const type = p.packageType;
  if (type === "MONTHLY") return "per month";
  if (type === "ANNUAL") return "per year";
  return null;
}

export const PaywallCard: React.FC<Props> = ({ used, limit, onUpgrade }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("chat");
  const extra = getExtraConfig();
  const termsUrl = extra.termsUrl ?? "";
  const privacyUrl = extra.privacyUrl ?? "";

  const [loading, setLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({
    priceText: null,
    periodText: null,
  });

  const canShowLinks = useMemo(
    () => !!termsUrl && !!privacyUrl,
    [termsUrl, privacyUrl]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (billingDisabled()) return;

      try {
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        const packages = current?.availablePackages ?? [];
        const findById = (id: string) =>
          packages.find((p) => p.identifier === id);
        const monthly =
          findById("$rc_monthly") ||
          packages.find((p) => p.packageType === "MONTHLY");
        const annual =
          findById("$rc_annual") ||
          packages.find((p) => p.packageType === "ANNUAL");
        const selected = monthly || annual || packages[0] || null;

        const product = selected?.product;
        const priceText = product?.priceString
          ? String(product.priceString)
          : null;
        const periodText = selected ? packagePeriodLabel(selected) : null;

        if (mounted) setPriceInfo({ priceText, periodText });
      } catch {
        if (mounted) setPriceInfo({ priceText: null, periodText: null });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const onRestore = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await restorePurchases();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("limit.title")}</Text>
      <Text style={styles.body}>{t("limit.body", { used, limit })}</Text>

      {(priceInfo.priceText || priceInfo.periodText) && (
        <Text style={styles.priceLine}>
          {priceInfo.priceText ? priceInfo.priceText : ""}
          {priceInfo.priceText && priceInfo.periodText ? " " : ""}
          {priceInfo.periodText ? priceInfo.periodText : ""}
        </Text>
      )}

      <Text style={styles.disclaimer}>
        {t("paywall.autorenew", {
          defaultValue:
            "Payment will be charged to your account. Subscription auto-renews unless canceled at least 24 hours before the end of the current period.",
        })}
      </Text>

      <Pressable
        onPress={onUpgrade}
        style={({ pressed }) => [
          styles.cta,
          {
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.ctaLabel}>{t("limit.button")}</Text>
      </Pressable>

      <Pressable
        onPress={onRestore}
        disabled={loading || billingDisabled()}
        style={({ pressed }) => [
          styles.restore,
          {
            opacity: billingDisabled() ? 0.4 : pressed ? 0.8 : 1,
          },
        ]}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : (
          <Text style={styles.restoreLabel}>
            {t("paywall.restore", { defaultValue: "Restore Purchases" })}
          </Text>
        )}
      </Pressable>

      {canShowLinks && (
        <View style={styles.linksRow}>
          <Pressable
            onPress={() => Linking.openURL(termsUrl)}
            accessibilityRole="link"
          >
            <Text style={styles.link}>
              {t("paywall.terms", { defaultValue: "Terms" })}
            </Text>
          </Pressable>
          <Text style={styles.dot}>•</Text>
          <Pressable
            onPress={() => Linking.openURL(privacyUrl)}
            accessibilityRole="link"
          >
            <Text style={styles.link}>
              {t("paywall.privacy", { defaultValue: "Privacy" })}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      padding: theme.spacing.md,
      borderRadius: theme.rounded.md,
      alignSelf: "stretch",
      borderWidth: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
      shadowColor: theme.shadow,
    },
    title: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
      color: theme.text,
    },
    body: {
      fontSize: theme.typography.size.base,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
      color: theme.textSecondary,
    },
    priceLine: {
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
      color: theme.text,
    },
    disclaimer: {
      fontSize: theme.typography.size.xs,
      lineHeight: theme.typography.size.sm,
      textAlign: "center",
      color: theme.textSecondary,
    },
    cta: {
      alignSelf: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.md,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.accentSecondary,
    },
    ctaLabel: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.onAccent,
    },
    restore: {
      alignSelf: "center",
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    restoreLabel: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.textSecondary,
    },
    linksRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: theme.spacing.xs,
    },
    link: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.accentSecondary,
    },
    dot: {
      marginHorizontal: theme.spacing.sm,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.textSecondary,
    },
  });
