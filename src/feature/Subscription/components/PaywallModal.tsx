import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/Modal";

type Props = {
  visible: boolean;
  busy?: boolean;
  priceText: string;
  onClose: () => void;
  onSubscribe: () => void;
  onRestore: () => void;
  termsUrl?: string;
  privacyUrl?: string;
};

const BENEFITS = [
  "unlimitedAiChat",
  "unlimitedAiMealRecognition",
  "fullCloudBackup",
  "fullHistoryAccess",
  "earlyAccess",
] as const;

export const PaywallModal: React.FC<Props> = ({
  visible,
  busy,
  priceText,
  onClose,
  onSubscribe,
  onRestore,
  termsUrl,
  privacyUrl,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const { t } = useTranslation("profile");

  return (
    <Modal
      visible={visible}
      fullScreen
      onClose={onClose}
      title={t("paywall.title", { defaultValue: "Premium Monthly" })}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={onSubscribe}
            disabled={busy}
            activeOpacity={0.8}
            style={[
              styles.cta,
              {
                opacity: busy ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.ctaText}>
              {t("paywall.subscribe", { defaultValue: "Subscribe" })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRestore}
            disabled={busy}
            activeOpacity={0.7}
            style={styles.restoreButton}
          >
            <Text style={styles.linkText}>
              {t("manageSubscription.restorePurchases", {
                defaultValue: "Restore Purchases",
              })}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            {t("paywall.disclaimer", {
              defaultValue:
                "Auto-renewable subscription. Cancel anytime in your App Store settings.",
            })}
          </Text>

          {!!termsUrl && !!privacyUrl && (
            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() => Linking.openURL(termsUrl)}
                activeOpacity={0.7}
                disabled={busy}
              >
                <Text style={styles.linkText}>
                  {t("termsOfService", { defaultValue: "Terms of Service" })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL(privacyUrl)}
                activeOpacity={0.7}
                disabled={busy}
              >
                <Text style={styles.linkText}>
                  {t("privacyPolicy", { defaultValue: "Privacy Policy" })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      }
      contentPaddingBottom={0}
    >
      <View style={styles.priceBlock}>
        <Text style={styles.priceLabel}>
          {t("paywall.priceLabel", { defaultValue: "Price" })}
        </Text>
        <Text style={styles.priceValue}>
          {priceText}
        </Text>
      </View>

      <View style={styles.benefits}>
        <Text style={styles.benefitsTitle}>
          {t("manageSubscription.premiumBenefits")}
        </Text>

        {BENEFITS.map((key) => (
          <View
            key={key}
            style={styles.benefitRow}
          >
            <Text style={styles.benefitText}>
              {t(`manageSubscription.benefit_${key}`)}
            </Text>
          </View>
        ))}
      </View>
    </Modal>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    footer: { gap: theme.spacing.sm },
    cta: {
      borderRadius: theme.rounded.sm,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      backgroundColor: theme.accentSecondary,
    },
    ctaText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.extraBold,
      color: theme.onAccent,
    },
    restoreButton: {
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
    },
    linkText: {
      color: theme.accentSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
    },
    disclaimer: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.xs,
      lineHeight: theme.typography.lineHeight.tight,
      textAlign: "center",
    },
    linksRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: theme.spacing.md,
    },
    priceBlock: { alignItems: "center", marginBottom: theme.spacing.lg },
    priceLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.base,
      marginBottom: theme.spacing.xs,
    },
    priceValue: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.extraBold,
    },
    benefits: { gap: theme.spacing.sm },
    benefitsTitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
    },
    benefitRow: {
      borderWidth: 1,
      borderRadius: theme.rounded.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    benefitText: {
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.semiBold,
      flex: 1,
    },
  });
