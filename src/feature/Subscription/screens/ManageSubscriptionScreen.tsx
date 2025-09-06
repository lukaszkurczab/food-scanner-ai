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
import { Layout } from "@/components";
import { usePremiumContext } from "@/context/PremiumContext";
import {
  openManageSubscriptions,
  startOrRenewSubscription,
  restorePurchases,
} from "@/feature/Subscription/services/purchase";

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

  if (!subscription) {
    return <Text style={{ color: theme.text }}>Loading…</Text>;
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
      ? `${t("manageSubscription.premium")} (${t("expired", {
          defaultValue: "expired",
        })})`
      : t("manageSubscription.free");

  const tryOpenManage = async () => {
    setBusy(true);
    try {
      const ok = await openManageSubscriptions();
      if (!ok) {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.billingUnavailable", {
            defaultValue: "Billing is unavailable on this device.",
          })
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const tryPurchase = async () => {
    setBusy(true);
    try {
      const res = await startOrRenewSubscription();
      if (res.status === "success") return;
      if (res.status === "unavailable") {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.billingUnavailable", {
            defaultValue: "Billing is unavailable on this device.",
          })
        );
      } else if (res.status === "error") {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.purchaseFailed", {
            defaultValue: "Purchase failed. Please try again.",
          })
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
      if (res.status === "unavailable") {
        Alert.alert(
          t("manageSubscription.title"),
          t("manageSubscription.billingUnavailable", {
            defaultValue: "Billing is unavailable on this device.",
          })
        );
      }
    } finally {
      setBusy(false);
    }
  };

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
            onPress={() => Linking.openURL(t("manageSubscription.refundLink"))}
            activeOpacity={0.7}
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
        </View>

        {showCancel && (
          <TouchableOpacity
            style={[
              styles.rowBetween,
              {
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              },
            ]}
            onPress={tryOpenManage}
            disabled={busy}
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
              },
            ]}
            onPress={tryPurchase}
            disabled={busy}
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
            onPress={tryPurchase}
            disabled={busy}
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
