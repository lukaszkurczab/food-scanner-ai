import React from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { Layout, PrimaryButton } from "@/components";
import { ScrollableBox } from "@/components/ScrollableBox";
import { parseMarkdownToReactNative } from "@/utils/parseMarkdownToReactNative";

export default function TermsScreen({ navigation }: any) {
  const { t } = useTranslation("terms");
  const theme = useTheme();

  const windowHeight = Dimensions.get("window").height;
  const calculatedHeight = Math.max(0, windowHeight - 190);

  const termsText = t("text");

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <Layout showNavigation={false}>
      <View style={styles.centerBoth}>
        <ScrollableBox style={{ height: calculatedHeight }}>
          {parseMarkdownToReactNative(termsText, theme)}
        </ScrollableBox>

        <PrimaryButton
          label={t("close")}
          onPress={handleClose}
          style={styles.cta}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerBoth: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  cta: {
    width: 200,
    alignSelf: "center",
  },
});
