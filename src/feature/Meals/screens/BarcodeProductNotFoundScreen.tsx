import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { PrimaryButton, SecondaryButton, Layout } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/navigate";

const MAX_ATTEMPTS = 3;

export default function BarcodeProductNotFoundScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const { t } = useTranslation("meals");

  const code = route.params?.code as string | undefined;
  const attempt = (route.params?.attempt as number | undefined) || 1;
  const returnTo =
    (route.params?.returnTo as keyof RootStackParamList) || "MealAddMethod";

  const handleRetry = () => {
    if (attempt >= MAX_ATTEMPTS) {
      handleBack();
      return;
    }

    const targetScreen =
      returnTo === "ReviewIngredients" ? "MealCamera" : "BarCodeCamera";

    navigation.replace(targetScreen as any, {
      attempt: attempt + 1,
      returnTo,
    });
  };

  const handleBack = () => {
    navigation.replace(returnTo as any);
  };

  const isLastAttempt = attempt >= MAX_ATTEMPTS;

  return (
    <Layout>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <MaterialIcons
            name="qr-code-scanner"
            size={64}
            color={theme.textSecondary}
          />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("barcode_not_found_title", "We couldn't find this product")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isLastAttempt
            ? t(
                "barcode_not_found_last",
                "We still couldn't find the product. Please add the meal manually or choose a different method."
              )
            : t("barcode_not_found_sub", {
                defaultValue:
                  "We couldn't get nutrition data for this barcode. You can try again or choose a different method.",
                code,
              })}
        </Text>
        <View style={{ height: 24 }} />
        {!isLastAttempt && (
          <PrimaryButton
            label={`${t(
              "barcode_try_again",
              "Scan again"
            )} (${attempt}/${MAX_ATTEMPTS})`}
            onPress={handleRetry}
            style={{ marginTop: 0 }}
          />
        )}
        <SecondaryButton
          label={
            returnTo === "ReviewIngredients"
              ? t("barcode_back_to_review", "Back to ingredients")
              : t("barcode_back_to_methods", "Back to method selection")
          }
          onPress={handleBack}
          style={{ marginTop: 12 }}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
  },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", marginTop: 10 },
});
