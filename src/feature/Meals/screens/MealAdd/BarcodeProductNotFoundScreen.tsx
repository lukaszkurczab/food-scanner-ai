import { useCallback, useEffect, useMemo } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Layout } from "@/components";
import AppIcon from "@/components/AppIcon";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useTheme } from "@/theme/useTheme";

export default function BarcodeProductNotFoundScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"BarcodeProductNotFound">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("meals");

  const code = params?.code;

  const handleBackToBarcode = useCallback(() => {
    flow.replace("BarcodeScan", code ? { code } : {});
  }, [code, flow]);

  const handleScanAgain = useCallback(() => {
    flow.replace("BarcodeScan", {});
  }, [flow]);

  const handleEditCode = useCallback(() => {
    flow.replace("BarcodeScan", {
      code,
      showManualEntry: true,
    });
  }, [code, flow]);

  useEffect(() => {
    const onBackPress = () => {
      handleBackToBarcode();
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBackToBarcode]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      const actionType = e.data.action.type;
      const isBackAction =
        actionType === "GO_BACK" ||
        actionType === "POP" ||
        actionType === "POP_TO_TOP";

      if (!isBackAction) return;

      e.preventDefault();
      handleBackToBarcode();
    });

    return sub;
  }, [handleBackToBarcode, navigation]);

  return (
    <Layout>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <AppIcon name="scan-barcode" size={64} color={theme.textSecondary} />
        </View>

        <Text style={styles.title}>
          {t("barcode_not_found_title", {
            defaultValue: "We couldn't find this product",
          })}
        </Text>
        <Text style={styles.subtitle}>
          {t("barcode_not_found_sub", {
            defaultValue:
              "We searched this barcode, but there isn't a matching product in the catalog yet.",
          })}
        </Text>

        {code ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>
              {t("barcode_searched_code_label", {
                defaultValue: "Searched code",
              })}
            </Text>
            <Text style={styles.codeValue}>{code}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={t("barcode_not_found_edit_code", {
              defaultValue: "Edit code",
            })}
            onPress={handleEditCode}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleScanAgain}
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed ? styles.secondaryActionPressed : null,
            ]}
          >
            <Text style={styles.secondaryActionLabel}>
              {t("barcode_not_found_scan_again", {
                defaultValue: "Scan again",
              })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.screenPadding,
      backgroundColor: theme.background,
    },
    iconWrapper: {
      width: 124,
      height: 124,
      borderRadius: theme.rounded.xl,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: theme.spacing.xl,
      borderWidth: 1,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    title: {
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      color: theme.text,
    },
    subtitle: {
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      textAlign: "center",
      marginTop: theme.spacing.sm,
      color: theme.textSecondary,
    },
    codeCard: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: "center",
      gap: theme.spacing.xxs,
    },
    codeLabel: {
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    codeValue: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.text,
    },
    actions: {
      marginTop: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    secondaryAction: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    secondaryActionPressed: {
      opacity: 0.72,
    },
    secondaryActionLabel: {
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.textSecondary,
    },
  });
