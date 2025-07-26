import React from "react";
import { View, Dimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import { Layout, PrimaryButton } from "@/src/components";
import { ScrollableBox } from "@/src/components/ScrollableBox";
import { parseMarkdownToReactNative } from "@/src/utils/parseMarkdownToReactNative";

export default function TermsScreen({ navigation }: any) {
  const { t } = useTranslation("terms");
  const theme = useTheme();

  const windowHeight = Dimensions.get("window").height;
  const calculatedHeight = Math.max(0, windowHeight - 190);

  const termsText = t("text");

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  return (
    <Layout>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ScrollableBox style={{ height: calculatedHeight }}>
          {parseMarkdownToReactNative(termsText, theme)}
        </ScrollableBox>

        <PrimaryButton
          label={t("close")}
          onPress={handleClose}
          style={{ width: 200, alignSelf: "center" }}
        />
      </View>
    </Layout>
  );
}
