import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { useTheme } from "@/theme/useTheme";
import {
  FormScreenShell,
  InfoBlock,
} from "@/components";
import AppIcon from "@/components/AppIcon";

type ChangeEmailCheckMailboxRoute = RouteProp<
  RootStackParamList,
  "ChangeEmailCheckMailbox"
>;

type ChangeEmailCheckMailboxNavigation = StackNavigationProp<
  RootStackParamList,
  "ChangeEmailCheckMailbox"
>;

type ChangeEmailCheckMailboxScreenProps = {
  navigation: ChangeEmailCheckMailboxNavigation;
  route: ChangeEmailCheckMailboxRoute;
};

export default function ChangeEmailCheckMailboxScreen({
  navigation,
  route,
}: ChangeEmailCheckMailboxScreenProps) {
  const { t } = useTranslation(["profile", "common"]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const email =
    typeof route.params?.email === "string" ? route.params.email : "";

  return (
    <FormScreenShell
      title={t("verifyNewEmailTitle", {
        defaultValue: "Verify your new email",
      })}
      intro={t("verifyNewEmailIntro", {
        defaultValue:
          "We’ve sent a verification message to your new address. Confirm it to finish updating your account.",
      })}
      onBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("EditUserData");
        }
      }}
      actionLabel={t("verifyNewEmailDone", {
        defaultValue: "Back to profile details",
      })}
      onActionPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("EditUserData");
        }
      }}
      secondaryActionLabel={t("verifyNewEmailChangeAgain", {
        defaultValue: "Use a different email",
      })}
      secondaryActionPress={() => navigation.replace("ChangeEmail")}
    >
      <View style={styles.content}>
        <InfoBlock
          title={t("verifyNewEmailSentTitle", {
            defaultValue: "Verification sent",
          })}
          body={t("verifyNewEmailSentBody", {
            defaultValue:
              "Open the message sent to {{email}} and follow the link to confirm your new email address.",
            email,
          })}
          tone="info"
          icon={<AppIcon name="email" size={18} color={theme.info.text} />}
        />

        <InfoBlock
          title={t("verifyNewEmailResendTitle", {
            defaultValue: "Need another email?",
          })}
          body={t("verifyNewEmailResendUnavailable", {
            defaultValue:
              "Resend is not available from this screen yet. If you need another verification email, go back and submit the change again.",
          })}
          tone="warning"
          icon={<AppIcon name="info" size={18} color={theme.warning.text} />}
        />
      </View>
    </FormScreenShell>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.sectionGap,
    },
  });
