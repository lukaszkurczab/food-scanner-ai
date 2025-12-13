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
import Constants from "expo-constants";
import * as Device from "expo-device";
import { restorePurchases } from "@/feature/Subscription/services/purchase";

type Props = {
  used: number;
  limit: number;
  onUpgrade?: () => void;
};

function billingDisabled(): boolean {
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
  return !!extra.disableBilling || !Device.isDevice;
}

type PriceInfo = {
  priceText: string | null;
  periodText: string | null;
};

function packagePeriodLabel(p: any): string | null {
  const type = p?.packageType;
  if (type === "MONTHLY") return "per month";
  if (type === "ANNUAL") return "per year";
  return null;
}

export const PaywallCard: React.FC<Props> = ({ used, limit, onUpgrade }) => {
  const theme = useTheme();
  const { t } = useTranslation("chat");
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
  const termsUrl = typeof extra.termsUrl === "string" ? extra.termsUrl : "";
  const privacyUrl =
    typeof extra.privacyUrl === "string" ? extra.privacyUrl : "";

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
          packages.find((p: any) => p.identifier === id);
        const monthly =
          findById("$rc_monthly") ||
          packages.find((p: any) => p.packageType === "MONTHLY");
        const annual =
          findById("$rc_annual") ||
          packages.find((p: any) => p.packageType === "ANNUAL");
        const selected: any = monthly || annual || packages[0];

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
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {t("limit.title")}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {t("limit.body", { used, limit })}
      </Text>

      {(priceInfo.priceText || priceInfo.periodText) && (
        <Text style={[styles.priceLine, { color: theme.text }]}>
          {priceInfo.priceText ? priceInfo.priceText : ""}
          {priceInfo.priceText && priceInfo.periodText ? " " : ""}
          {priceInfo.periodText ? priceInfo.periodText : ""}
        </Text>
      )}

      <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
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
            backgroundColor: theme.accentSecondary,
            borderRadius: theme.rounded.full,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.ctaLabel, { color: theme.onAccent }]}>
          {t("limit.button")}
        </Text>
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
          <Text style={[styles.restoreLabel, { color: theme.textSecondary }]}>
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
            <Text style={[styles.link, { color: theme.accentSecondary }]}>
              {t("paywall.terms", { defaultValue: "Terms" })}
            </Text>
          </Pressable>
          <Text style={[styles.dot, { color: theme.textSecondary }]}>•</Text>
          <Pressable
            onPress={() => Linking.openURL(privacyUrl)}
            accessibilityRole="link"
          >
            <Text style={[styles.link, { color: theme.accentSecondary }]}>
              {t("paywall.privacy", { defaultValue: "Privacy" })}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    alignSelf: "stretch",
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  body: { fontSize: 16, marginBottom: 12, textAlign: "center" },
  priceLine: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  disclaimer: { fontSize: 12, lineHeight: 16, textAlign: "center" },
  cta: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  ctaLabel: { fontSize: 15, fontWeight: "700" },
  restore: { alignSelf: "center", paddingVertical: 10, marginTop: 6 },
  restoreLabel: { fontSize: 14, fontWeight: "700" },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  link: { fontSize: 14, fontWeight: "700" },
  dot: { marginHorizontal: 8, fontSize: 14, fontWeight: "700" },
});
