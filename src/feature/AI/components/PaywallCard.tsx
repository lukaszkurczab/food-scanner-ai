import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import Purchases from "react-native-purchases";
import type { PurchasesPackage } from "react-native-purchases";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { restorePurchases } from "@/services/billing/purchase";
import { resolvePurchaseErrorMessage } from "@/services/billing/purchaseErrorMessage";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumContext } from "@/context/PremiumContext";
import { getTermsUrl } from "@/utils/legalUrls";

type Props = {
  balance: number;
  allocation: number;
  renewalAt?: string | null;
  onUpgrade?: () => void;
};

type PriceInfo = {
  priceText: string | null;
  periodText: string | null;
};

type ExtraConfig = {
  disableBilling?: boolean;
  privacyUrl?: string;
};

function getExtraConfig(): ExtraConfig {
  const raw = Constants.expoConfig?.extra;
  if (!raw || typeof raw !== "object") return {};
  const extra = raw as Record<string, unknown>;

  return {
    disableBilling:
      typeof extra.disableBilling === "boolean"
        ? extra.disableBilling
        : undefined,
    privacyUrl:
      typeof extra.privacyUrl === "string" ? extra.privacyUrl : undefined,
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

function formatRenewalDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export const PaywallCard: React.FC<Props> = ({
  balance,
  allocation,
  renewalAt,
  onUpgrade,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("chat");
  const { uid } = useAuthContext();
  const { refreshPremium } = usePremiumContext();

  const extra = getExtraConfig();
  const termsUrl = getTermsUrl();
  const privacyUrl = extra.privacyUrl ?? "";

  const [loading, setLoading] = useState(false);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({
    priceText: null,
    periodText: null,
  });

  const canShowLinks = useMemo(
    () => !!termsUrl && !!privacyUrl,
    [termsUrl, privacyUrl],
  );

  const renewalDate = formatRenewalDate(renewalAt);

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

        if (mounted) {
          setPriceInfo({ priceText, periodText });
        }
      } catch {
        if (mounted) {
          setPriceInfo({ priceText: null, periodText: null });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const onRestore = async () => {
    if (loading) return;

    const title = t("paywall.restoreTitle", {
      defaultValue: "Manage subscription",
    });

    if (billingDisabled()) {
      Alert.alert(
        title,
        t("paywall.billingUnavailable", {
          defaultValue: "Billing is unavailable on this device.",
        }),
      );
      return;
    }

    if (!uid) {
      Alert.alert(
        title,
        t("paywall.signInRequired", {
          defaultValue: "Please sign in to restore purchases.",
        }),
      );
      return;
    }

    setLoading(true);

    try {
      const res = await restorePurchases(uid);

      if (res.status === "success") {
        await refreshPremium();
        Alert.alert(
          title,
          t("paywall.restoreSuccess", {
            defaultValue: "Purchases restored.",
          }),
        );
      } else if (res.status === "cancelled") {
        return;
      } else {
        const fallback = t("paywall.restoreFailed", {
          defaultValue: "Restore failed. Try again later.",
        });

        Alert.alert(
          title,
          resolvePurchaseErrorMessage(t, res.errorCode, fallback),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("limit.title")}</Text>

      <Text style={styles.body}>
        {t("limit.body", {
          balance,
          allocation,
          renewalDate: renewalDate ?? t("credits.renewalUnknown"),
        })}
      </Text>

      {(priceInfo.priceText || priceInfo.periodText) && (
        <Text style={styles.priceLine}>
          {priceInfo.priceText ? priceInfo.priceText : ""}
          {priceInfo.priceText && priceInfo.periodText ? " " : ""}
          {priceInfo.periodText ? priceInfo.periodText : ""}
        </Text>
      )}

      <Text style={styles.disclaimer}>
        {t("paywall.autorenew", {
          storeName: Platform.OS === "ios" ? "App Store" : "Google Play",
          defaultValue:
            "Payment will be charged to your account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel subscriptions in your {{storeName}} account settings.",
        })}
      </Text>

      <Pressable
        onPress={onUpgrade}
        style={({ pressed }) => [
          styles.cta,
          pressed ? styles.ctaPressed : null,
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
          billingDisabled() ? styles.restoreDisabled : null,
          pressed && !billingDisabled() ? styles.restorePressed : null,
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
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.2 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    title: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
      color: theme.text,
    },
    body: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
    priceLine: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
      color: theme.text,
    },
    disclaimer: {
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      textAlign: "center",
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
    cta: {
      alignSelf: "center",
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.md,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.cta.primaryBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    ctaPressed: {
      opacity: 0.84,
    },
    ctaLabel: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.cta.primaryText,
    },
    restore: {
      alignSelf: "center",
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    restorePressed: {
      opacity: 0.8,
    },
    restoreDisabled: {
      opacity: 0.4,
    },
    restoreLabel: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.textSecondary,
    },
    linksRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: theme.spacing.xs,
    },
    link: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.link,
    },
    dot: {
      marginHorizontal: theme.spacing.sm,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.textSecondary,
    },
  });
