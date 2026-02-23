import { View, Text, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { spacing } from "@/theme";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { FullScreenLoader, Layout } from "@/components";
import { usePremiumContext } from "@/context/PremiumContext";
import { useAuthContext } from "@/context/AuthContext";
import { PaywallModal } from "@/feature/Subscription/components/PaywallModal";
import { useManageSubscriptionState } from "@/feature/Subscription/hooks/useManageSubscriptionState";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

const BENEFITS = [
  "unlimitedAiChat",
  "unlimitedAiMealRecognition",
  "fullCloudBackup",
  "fullHistoryAccess",
  "earlyAccess",
] as const;

type ManageSubscriptionNavigation = StackNavigationProp<
  RootStackParamList,
  "ManageSubscription"
>;

type ManageSubscriptionScreenProps = {
  navigation: ManageSubscriptionNavigation;
};

export default function ManageSubscriptionScreen({
  navigation,
}: ManageSubscriptionScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation("profile");
  const { uid } = useAuthContext();
  const subscription = useSubscriptionData(uid);
  const { isPremium, setDevPremium, refreshPremium } = usePremiumContext();

  const {
    expanded,
    busy,
    paywallVisible,
    termsUrl,
    privacyUrl,
    priceText,
    showCancel,
    showRenew,
    showStart,
    headerStatus,
    isPremiumComputed,
    toggleExpanded,
    tryOpenManage,
    tryRestore,
    trySubscribe,
    tryOpenRefundPolicy,
    openPaywall,
    closePaywall,
    toggleDevPremium,
    openTerms,
    openPrivacy,
  } = useManageSubscriptionState({
    uid,
    subscriptionState: subscription?.state,
    isPremium,
    refreshPremium,
    setDevPremium,
    t,
  });

  if (!subscription) {
    return (
      <Layout disableScroll>
        <FullScreenLoader />
      </Layout>
    );
  }

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
            <Text style={{ fontSize: 18, fontWeight: "400", color: theme.text }}>
              {headerStatus}
            </Text>
            {busy && <ActivityIndicator size="small" color={theme.textSecondary} />}
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
                onPress={() => toggleExpanded(key)}
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
            <Text style={{ fontSize: 18, fontWeight: "500", color: theme.text }}>
              {t("manageSubscription.restorePurchases", {
                defaultValue: "Restore Purchases",
              })}
            </Text>
            <Ionicons name="refresh" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowBetween, { paddingVertical: spacing.sm }]}
            onPress={tryOpenRefundPolicy}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text style={{ fontSize: 18, fontWeight: "500", color: theme.text }}>
              {t("manageSubscription.refundPolicy")}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
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
                <TouchableOpacity onPress={() => void openTerms()} activeOpacity={0.7} disabled={busy}>
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

                <TouchableOpacity onPress={() => void openPrivacy()} activeOpacity={0.7} disabled={busy}>
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
            onPress={toggleDevPremium}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text style={{ fontWeight: "bold", fontSize: 18, color: theme.text }}>
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
