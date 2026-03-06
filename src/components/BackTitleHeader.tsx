import { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";

export type BackTitleHeaderProps = {
  title: string;
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
  backAccessibilityLabel?: string;
  backButtonTestID?: string;
};

export function BackTitleHeader({
  title,
  onBack,
  style,
  backAccessibilityLabel,
  backButtonTestID = "back-title-header-back",
}: BackTitleHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={
          backAccessibilityLabel ??
          t("common:back", { defaultValue: "Back" })
        }
        testID={backButtonTestID}
        style={styles.backButton}
      >
        <MaterialIcons name="chevron-left" size={28} color={theme.text} />
      </Pressable>

      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      flexDirection: "row",
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    backButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 22,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      flexShrink: 1,
    },
  });

export default BackTitleHeader;
