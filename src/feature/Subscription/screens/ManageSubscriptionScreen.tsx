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
import Constants from "expo-constants";
import {
  openManageSubscriptions,
  restorePurchases,
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
  const subscription = useSubscriptionData();
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
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.restoreNothing", {
            defaultValue: "No purchases to restore.",
          }),
        );
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
          t("manageSubscription.restoreFailed", {
            defaultValue: "Restore failed. Try again later.",
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

          {isPremiumComputed && subscription.renewDate && (
            <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 18,
                  fontWeight: "500",
                }}
              >
                {t("manageSubscription.renew")}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
              >
                {subscription.renewDate}
              </Text>
            </View>
          )}

          {isPremiumComputed && subscription.plan && (
            <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 18,
                  fontWeight: "500",
                }}
              >
                {t("manageSubscription.plan")}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
              >
                {t(`manageSubscription.plan_${subscription.plan}`)}
              </Text>
            </View>
          )}

          {(subscription.lastPaymentAmount || subscription.lastPayment) && (
            <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 18,
                  fontWeight: "500",
                }}
              >
                {t("manageSubscription.lastPayment")}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
              >
                {subscription.lastPaymentAmount
                  ? `${subscription.lastPaymentAmount} `
                  : ""}
                {subscription.lastPayment
                  ? `(${subscription.lastPayment})`
                  : ""}
              </Text>
            </View>
          )}

          {isPremiumComputed && subscription.startDate && (
            <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 18,
                  fontWeight: "500",
                }}
              >
                {t("manageSubscription.subscriptionStart")}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
              >
                {subscription.startDate}
              </Text>
            </View>
          )}

          {!isPremiumComputed && subscription.endDate && (
            <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 18,
                  fontWeight: "500",
                }}
              >
                {t("manageSubscription.subscriptionEnd")}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
              >
                {subscription.endDate}
              </Text>
            </View>
          )}

          {isPremiumComputed && isExpired && subscription.endDate && (
            <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 18,
                  fontWeight: "500",
                }}
              >
                {t("manageSubscription.inactiveSince", {
                  defaultValue: "Inactive since",
                })}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
              >
                {subscription.endDate}
              </Text>
            </View>
          )}
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

        {showRenew && (
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
              {t("manageSubscription.renewSubscription")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.accentSecondary}
            />
          </TouchableOpacity>
        )}

        {showStart && (
          <TouchableOpacity
            style={[
              styles.rowBetween,
              {
                marginTop: spacing.lg,
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.border,
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
              {t("manageSubscription.startSubscription")}
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
          onSubscribe={async () => {
            closePaywall();
            Alert.alert(
              t("manageSubscription.title"),
              t("paywall.purchaseNotReady", {
                defaultValue:
                  "Purchases are not available yet. Submit the in-app purchase with a new app version for review.",
              }),
            );
          }}
          onRestore={tryRestore}
          termsUrl={termsUrl}
          privacyUrl={privacyUrl}
        />

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
          <Text style={{ fontWeight: "bold", fontSize: 18, color: theme.text }}>
            {`DEV: ${isPremiumComputed ? "Disable" : "Enable"} Premium`}
          </Text>
          <Ionicons name="build" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
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
