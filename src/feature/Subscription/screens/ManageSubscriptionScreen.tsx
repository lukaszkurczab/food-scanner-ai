import { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTheme } from "@/theme/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { BackTitleHeader, FullScreenLoader, Layout, PrimaryButton } from "@/components";
import { usePremiumContext } from "@/context/PremiumContext";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { useAuthContext } from "@/context/AuthContext";
import { PaywallModal } from "@/feature/Subscription/components/PaywallModal";
import { useManageSubscriptionState } from "@/feature/Subscription/hooks/useManageSubscriptionState";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { AiCreditsSummaryCard } from "@/components/AiCreditsSummaryCard";

const BENEFITS = [
  "aiCredits800",
  "flexibleAiUsage",
  "photoAnalysisIncluded",
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("profile");
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;
  const { uid } = useAuthContext();
  const { credits, loading: creditsLoading } = useAiCreditsContext();
  const { isPremium, subscription, setDevPremium, refreshPremium } =
    usePremiumContext();
  const subscriptionStoreName =
    Platform.OS === "ios"
      ? t("manageSubscription.store.appStore", {
          defaultValue: "App Store",
        })
      : t("manageSubscription.store.googlePlay", {
          defaultValue: "Google Play",
        });

  const {
    expanded,
    busy,
    paywallVisible,
    termsUrl,
    privacyUrl,
    priceText,
    showRenew,
    showStart,
    showManageInStore,
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
    if (!isOnline) {
      return (
        <Layout>
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {t("manageSubscription.unavailableTitle", {
                defaultValue: "Subscription details unavailable",
              })}
            </Text>
            <Text style={styles.emptyDescription}>
              {t("manageSubscription.unavailableOfflineDesc", {
                defaultValue:
                  "You're offline and subscription details are not available locally yet.",
              })}
            </Text>
            <PrimaryButton
              label={t("common:retry")}
              onPress={() => {
                void refreshPremium();
              }}
              style={styles.emptyAction}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Profile")}
            >
              <Text style={styles.emptyBack}>
                {t("common:back", { defaultValue: "Back" })}
              </Text>
            </Pressable>
          </View>
        </Layout>
      );
    }
    return (
      <Layout disableScroll>
        <FullScreenLoader />
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={styles.flex}>
        <BackTitleHeader
          title={t("manageSubscription.title")}
          onBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate("Profile");
          }}
        />

        <View style={styles.sectionSpacing}>
          <Text style={styles.sectionLabel}>
            {t("manageSubscription.yourSubscription")}
          </Text>

          <View
            style={[
              styles.rowBetween,
              styles.rowBetweenSpacing,
              busy && styles.busy,
            ]}
          >
            <Text style={styles.statusText}>
              {headerStatus}
            </Text>
            {busy && <ActivityIndicator size="small" color={theme.textSecondary} />}
          </View>
        </View>

        <AiCreditsSummaryCard
          balance={credits?.balance ?? null}
          allocation={credits?.allocation ?? null}
          tier={credits?.tier ?? null}
          renewalAt={credits?.periodEndAt ?? null}
          loading={creditsLoading}
        />

        <View>
          <Text style={styles.sectionLabel}>
            {t("manageSubscription.premiumBenefits")}
          </Text>

          {BENEFITS.map((key) => (
            <View
              key={key}
              style={styles.benefitItem}
            >
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={() => toggleExpanded(key)}
                activeOpacity={0.7}
                disabled={busy}
              >
                <Text
                  style={styles.benefitTitle}
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
                  style={styles.benefitDesc}
                >
                  {t(`manageSubscription.benefitDesc_${key}`)}
                </Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.rowBetween,
              styles.actionRow,
              styles.actionRowTop,
            ]}
            onPress={tryRestore}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text style={styles.actionText}>
              {t("manageSubscription.restorePurchases", {
                defaultValue: "Restore Purchases",
              })}
            </Text>
            <Ionicons name="refresh" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowBetween, styles.actionRow]}
            onPress={tryOpenRefundPolicy}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text style={styles.actionText}>
              {t("manageSubscription.refundPolicy")}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {!!termsUrl && !!privacyUrl && (
            <View style={styles.legalSection}>
              <Text
                style={styles.legalText}
              >
                {t("manageSubscription.autorenewInfo", {
                  storeName: subscriptionStoreName,
                  defaultValue:
                    "Subscriptions auto-renew unless canceled at least 24 hours before the end of the current period. You can manage or cancel in your {{storeName}} account settings.",
                })}
              </Text>

              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => void openTerms()} activeOpacity={0.7} disabled={busy}>
                  <Text
                    style={styles.legalLink}
                  >
                    {t("termsOfService", { defaultValue: "Terms of Service" })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => void openPrivacy()} activeOpacity={0.7} disabled={busy}>
                  <Text
                    style={styles.legalLink}
                  >
                    {t("privacyPolicy", { defaultValue: "Privacy Policy" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {showManageInStore && (
          <TouchableOpacity
            style={[
              styles.rowBetween,
              styles.actionRow,
              styles.dividerTop,
            ]}
            onPress={tryOpenManage}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              {t("manageSubscription.manageInStore", {
                defaultValue: "Manage subscription in store",
              })}
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
              styles.actionRow,
              styles.dividerTopCompact,
            ]}
            onPress={openPaywall}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
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
              styles.actionRow,
              styles.dividerTop,
            ]}
            onPress={toggleDevPremium}
            activeOpacity={0.7}
            disabled={busy}
          >
            <Text style={styles.devText}>
              {`DEV: ${isPremiumComputed ? "Disable" : "Enable"} Premium`}
            </Text>
            <Ionicons name="build" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    sectionSpacing: { marginBottom: theme.spacing.xl },
    sectionLabel: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.sm,
      color: theme.textSecondary,
      opacity: 0.75,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowBetweenSpacing: { marginBottom: theme.spacing.sm },
    busy: { opacity: 0.6 },
    statusText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.text,
    },
    benefitItem: {
      marginBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: theme.spacing.sm,
    },
    benefitTitle: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.text,
      flexShrink: 1,
    },
    benefitDesc: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.base,
      opacity: 0.8,
      color: theme.textSecondary,
    },
    actionRow: { paddingVertical: theme.spacing.sm },
    actionRowTop: { marginTop: theme.spacing.xl },
    actionText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.text,
    },
    legalSection: { marginTop: theme.spacing.lg, gap: theme.spacing.sm },
    legalText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      lineHeight: theme.typography.lineHeight.tight,
    },
    legalLinks: { flexDirection: "row", gap: theme.spacing.md },
    legalLink: {
      color: theme.accentSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
    },
    dividerTop: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: theme.spacing.xl,
    },
    dividerTopCompact: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: theme.spacing.md,
    },
    linkText: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.md,
      color: theme.accentSecondary,
    },
    devText: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.md,
      color: theme.text,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      textAlign: "center",
      lineHeight: Math.round(theme.typography.size.sm * 1.5),
    },
    emptyAction: {
      marginTop: theme.spacing.sm,
      alignSelf: "stretch",
    },
    emptyBack: {
      color: theme.accentSecondary,
      fontFamily: theme.typography.fontFamily.medium,
      textDecorationLine: "underline",
    },
  });
