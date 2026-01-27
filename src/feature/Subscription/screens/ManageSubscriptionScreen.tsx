import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { spacing } from "@/theme";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { FullScreenLoader, Layout } from "@/components";
import { usePremiumContext } from "@/context/PremiumContext";
import { useAuthContext } from "@/context/AuthContext";
import Constants from "expo-constants";
import {
  openManageSubscriptions,
  restorePurchases,
  startOrRenewSubscription,
} from "@/feature/Subscription/services/purchase";
import { PaywallModal } from "@/feature/Subscription/components/PaywallModal";

const BENEFITS = [
  "unlimitedAiChat",
  "unlimitedAiMealRecognition",
  "fullCloudBackup",
  "fullHistoryAccess",
  "earlyAccess",
] as const;

export default function ManageSubscriptionScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation("profile");
  const { uid } = useAuthContext();

  const subscription = useSubscriptionData(uid);
  const { isPremium, setDevPremium } = usePremiumContext();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
  const termsUrl = typeof extra.termsUrl === "string" ? extra.termsUrl : "";
  const privacyUrl =
    typeof extra.privacyUrl === "string" ? extra.privacyUrl : "";

  if (!subscription) {
    return (
      <Layout disableScroll>
        <FullScreenLoader />
      </Layout>
    );
  }

  const state = subscription.state;
  const isPremiumComputed = (isPremium ??
    state.startsWith("premium")) as boolean;
  const isExpired = state.endsWith("expired");
  const isActive = state.endsWith("active");

  const showCancel = isPremiumComputed && isActive;
  const showRenew =
    (!isPremiumComputed && isActive) || (isPremiumComputed && isExpired);
  const showStart = !isPremiumComputed && !isExpired;

  const headerStatus =
    isPremiumComputed && isActive
      ? t("manageSubscription.premium")
      : isPremiumComputed && isExpired
        ? `${t("manageSubscription.premium")} (${t("expired", { defaultValue: "expired" })})`
        : t("manageSubscription.free");

  const priceText = t("paywall.priceText", {
    defaultValue: "29,99 zł / month",
  });

  const tryOpenManage = async () => {
    setBusy(true);
    try {
      const ok = await openManageSubscriptions();
      if (!ok) {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.billingUnavailable", {
            defaultValue: "Billing is unavailable on this device.",
          }),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const tryRestore = async () => {
    setBusy(true);
    try {
      const res = await restorePurchases();
      if (res.status === "success") {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.restoreSuccess", {
            defaultValue: "Purchases restored.",
          }),
        );
      } else if (res.status === "cancelled") {
        // user cancelled restore sheet
      } else if (res.status === "unavailable") {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.billingUnavailable", {
            defaultValue: "Billing is unavailable on this device.",
          }),
        );
      } else {
        Alert.alert(
          t("manageSubscription.title"),
          res.message ||
            t("manageSubscription.restoreFailed", {
              defaultValue: "Restore failed. Try again later.",
            }),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const trySubscribe = async () => {
    setBusy(true);
    try {
      const res = await startOrRenewSubscription();
      if (res.status === "success") {
        setPaywallVisible(false);
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.purchaseSuccess", {
            defaultValue: "Subscription active.",
          }),
        );
      } else if (res.status === "cancelled") {
        // user cancelled purchase
      } else if (res.status === "unavailable") {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.billingUnavailable", {
            defaultValue: "Billing is unavailable on this device.",
          }),
        );
      } else {
        Alert.alert(
          t("manageSubscription.title"),
          res.message ||
            t("manageSubscription.purchaseFailed", {
              defaultValue: "Purchase failed.",
            }),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const openPaywall = () => setPaywallVisible(true);
  const closePaywall = () => setPaywallVisible(false);

  return (
    <Layout>
      <View style={{ flex: 1 }}>
        <Pressable style={styles.header} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color={theme.text} />
          <Text
            style={[styles.heading, { color: theme.text }]}
            accessibilityRole="header"
          >
            {t("manageSubscription.title")}
          </Text>
        </Pressable>

        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: spacing.sm,
              color: theme.textSecondary,
              opacity: 0.75,
            }}
          >
            {t("manageSubscription.yourSubscription")}
          </Text>

          <View
            style={[
              styles.rowBetween,
              { marginBottom: spacing.sm, opacity: busy ? 0.6 : 1 },
            ]}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
            >
              {headerStatus}
            </Text>
            {busy && (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            )}
          </View>
        </View>

        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: spacing.sm,
              color: theme.textSecondary,
              opacity: 0.75,
            }}
          >
            {t("manageSubscription.premiumBenefits")}
          </Text>

          {BENEFITS.map((key) => (
            <View
              key={key}
              style={{
                marginBottom: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                paddingBottom: spacing.sm,
              }}
            >
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={() => setExpanded(expanded === key ? null : key)}
                activeOpacity={0.7}
                disabled={busy}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "500",
                    color: theme.text,
                    flexShrink: 1,
                  }}
                >
                  {t(`manageSubscription.benefit_${key}`)}
                </Text>
                <Ionicons
                  name={expanded === key ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>

              {expanded === key && (
                <Text
                  style={{
                    marginTop: spacing.xs,
                    fontSize: 16,
                    opacity: 0.8,
                    color: theme.textSecondary,
                  }}
                >
                  {t(`manageSubscription.benefitDesc_${key}`)}
                </Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.rowBetween,
              { paddingVertical: spacing.sm, marginTop: spacing.xl },
            ]}
            onPress={tryRestore}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "500", color: theme.text }}
            >
              {t("manageSubscription.restorePurchases", {
                defaultValue: "Restore Purchases",
              })}
            </Text>
            <Ionicons name="refresh" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowBetween, { paddingVertical: spacing.sm }]}
            onPress={() => Linking.openURL(t("manageSubscription.refundLink"))}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "500", color: theme.text }}
            >
              {t("manageSubscription.refundPolicy")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {!!termsUrl && !!privacyUrl && (
            <View style={{ marginTop: spacing.lg, gap: 10 }}>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {t("manageSubscription.autorenewInfo", {
                  defaultValue:
                    "Subscriptions auto-renew unless canceled at least 24 hours before the end of the current period. You can manage or cancel in your App Store / Google Play account settings.",
                })}
              </Text>

              <View style={{ flexDirection: "row", gap: 14 }}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(termsUrl)}
                  activeOpacity={0.7}
                  disabled={busy}
                >
                  <Text
                    style={{
                      color: theme.accentSecondary,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    {t("termsOfService", { defaultValue: "Terms of Service" })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => Linking.openURL(privacyUrl)}
                  activeOpacity={0.7}
                  disabled={busy}
                >
                  <Text
                    style={{
                      color: theme.accentSecondary,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    {t("privacyPolicy", { defaultValue: "Privacy Policy" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {showCancel && (
          <TouchableOpacity
            style={[
              styles.rowBetween,
              {
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                marginTop: spacing.xl,
              },
            ]}
            onPress={tryOpenManage}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                color: theme.accentSecondary,
              }}
            >
              {t("manageSubscription.cancelSubscription")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.accentSecondary}
            />
          </TouchableOpacity>
        )}

        {(showRenew || showStart) && (
          <TouchableOpacity
            style={[
              styles.rowBetween,
              {
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                marginTop: spacing.md,
              },
            ]}
            onPress={openPaywall}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                color: theme.accentSecondary,
              }}
            >
              {showRenew
                ? t("manageSubscription.renewSubscription")
                : t("manageSubscription.startSubscription")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.accentSecondary}
            />
          </TouchableOpacity>
        )}

        <PaywallModal
          visible={paywallVisible}
          busy={busy}
          priceText={priceText}
          onClose={closePaywall}
          onSubscribe={trySubscribe}
          onRestore={tryRestore}
          termsUrl={termsUrl}
          privacyUrl={privacyUrl}
        />

        {__DEV__ && (
          <TouchableOpacity
            style={[
              styles.rowBetween,
              {
                marginTop: spacing.xl,
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              },
            ]}
            onPress={() => setDevPremium(!isPremiumComputed)}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text
              style={{ fontWeight: "bold", fontSize: 18, color: theme.text }}
            >
              {`DEV: ${isPremiumComputed ? "Disable" : "Enable"} Premium`}
            </Text>
            <Ionicons name="build" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 24,
    gap: 16,
  },
  heading: { fontSize: 22, fontWeight: "bold" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
