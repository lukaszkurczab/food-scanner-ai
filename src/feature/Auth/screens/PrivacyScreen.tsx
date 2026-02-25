import { useMemo } from "react";
import { Dimensions, StyleSheet, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { Layout, PrimaryButton } from "@/components";
import { ScrollableBox } from "@/components/ScrollableBox";
import { parseMarkdownToReactNative } from "@/utils/parseMarkdownToReactNative";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type PrivacyNavigation = StackNavigationProp<RootStackParamList, "Privacy">;

type PrivacyScreenProps = {
  navigation: PrivacyNavigation;
};

export default function PrivacyScreen({ navigation }: PrivacyScreenProps) {
  const { t } = useTranslation("privacy");
  const theme = useTheme();

  const windowHeight = Dimensions.get("window").height;
  const calculatedHeight = Math.max(0, windowHeight - 190);
  const scrollStyle = useMemo<ViewStyle>(
    () => ({ height: calculatedHeight }),
    [calculatedHeight]
  );

  const privacyText = t("text", {
    openaiDataDisclosure: t("openaiDataDisclosure"),
  });

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <Layout showNavigation={false} disableScroll>
      <ScrollableBox style={scrollStyle}>
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
