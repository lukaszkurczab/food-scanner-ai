import React from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { Layout, PrimaryButton } from "@/components";
import { ScrollableBox } from "@/components/ScrollableBox";
import { parseMarkdownToReactNative } from "@/utils/parseMarkdownToReactNative";

export default function PrivacyScreen({ navigation }: any) {
  const { t } = useTranslation("privacy");
  const theme = useTheme();

  const windowHeight = Dimensions.get("window").height;
  const calculatedHeight = Math.max(0, windowHeight - 190);

  const privacyText = t("text");

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <Layout showNavigation={false} disableScroll>
      <ScrollableBox style={{ height: calculatedHeight }}>
        {parseMarkdownToReactNative(privacyText, theme)}
      </ScrollableBox>

      <PrimaryButton
        label={t("close")}
        onPress={handleClose}
        style={styles.cta}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  cta: {
    width: 200,
    alignSelf: "center",
  },
});
