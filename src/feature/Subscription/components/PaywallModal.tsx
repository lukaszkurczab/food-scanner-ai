import React from "react";
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
import { spacing } from "@/theme";

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
  const { t } = useTranslation("profile");

  return (
    <Modal
      visible={visible}
      fullScreen
      onClose={onClose}
      title={t("paywall.title", { defaultValue: "Premium Monthly" })}
      footer={
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={onSubscribe}
            disabled={busy}
            activeOpacity={0.8}
            style={[
              styles.cta,
              {
                backgroundColor: theme.accentSecondary,
                opacity: busy ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaText, { color: theme.onAccent }]}>
              {t("paywall.subscribe", { defaultValue: "Subscribe" })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRestore}
            disabled={busy}
            activeOpacity={0.7}
            style={{ paddingVertical: spacing.sm, alignItems: "center" }}
          >
            <Text
              style={{
                color: theme.accentSecondary,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {t("manageSubscription.restorePurchases", {
                defaultValue: "Restore Purchases",
              })}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 13,
              lineHeight: 18,
              textAlign: "center",
            }}
          >
            {t("paywall.disclaimer", {
              defaultValue:
                "Auto-renewable subscription. Cancel anytime in your App Store settings.",
            })}
          </Text>

          {!!termsUrl && !!privacyUrl && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 14,
              }}
            >
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
          )}
        </View>
      }
      contentPaddingBottom={0}
    >
      <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
        <Text
          style={{ color: theme.textSecondary, fontSize: 16, marginBottom: 6 }}
        >
          {t("paywall.priceLabel", { defaultValue: "Price" })}
        </Text>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800" }}>
          {priceText}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            color: theme.textSecondary,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 6,
          }}
        >
          {t("manageSubscription.premiumBenefits")}
        </Text>

        {BENEFITS.map((key) => (
          <View
            key={key}
            style={[
              styles.benefitRow,
              { borderColor: theme.border, backgroundColor: theme.card },
            ]}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: "600",
                flex: 1,
              }}
            >
              {t(`manageSubscription.benefit_${key}`)}
            </Text>
          </View>
        ))}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  cta: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "800",
  },
  benefitRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
