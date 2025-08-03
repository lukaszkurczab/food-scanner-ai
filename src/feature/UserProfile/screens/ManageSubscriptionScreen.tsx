import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { spacing } from "@/src/theme";
import { useSubscriptionData } from "@/src/hooks/useSubscriptionData";
import { Layout } from "@/src/components/index";

const BENEFITS = [
  "unlimitedAiChat",
  "fullCloudBackup",
  "unlimitedAiMealRecognition",
  "earlyAccess",
];

export default function ManageSubscriptionScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation("profile");
  const subscription = useSubscriptionData();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!subscription) {
    return <Text style={{ color: theme.text }}>Loading…</Text>;
  }

  const isPremium = subscription.state.startsWith("premium");
  const isActive = subscription.state.endsWith("active");
  const showRenew = !isPremium && isActive;
  const showStart = !isPremium && !isActive;
  const showCancel = isPremium && isActive;

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
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: spacing.sm,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "400", color: theme.text }}
            >
              {isPremium
                ? t("manageSubscription.premium")
                : t("manageSubscription.free")}
            </Text>
          </View>
          {isPremium && subscription.renewDate && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.sm,
              }}
            >
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
          {isPremium && subscription.plan && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.sm,
              }}
            >
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.sm,
              }}
            >
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
          {isPremium && subscription.startDate && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.sm,
              }}
            >
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
          {!isPremium && subscription.endDate && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.sm,
              }}
            >
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
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => setExpanded(expanded === key ? null : key)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "500",
                    color: theme.text,
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: spacing.sm,
              marginTop: spacing.xl,
            }}
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: spacing.lg,
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
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
  heading: {
    fontSize: 22,
    fontWeight: "bold",
  },
});
