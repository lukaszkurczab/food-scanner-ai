import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  ErrorBox,
  Layout,
  ScreenCornerNavButton,
  TextInput,
  TextButton,
} from "@/components";
import {
  MealAddPhotoScaffold,
  MealAddTextLink,
} from "@/feature/Meals/components/MealAddPhotoScaffold";
import { MealAddBarcodePreview } from "@/feature/Meals/components/MealAddBarcodePreview";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import {
  extractBarcodeFromPayload,
  lookupBarcodeProduct,
} from "@/services/barcode/barcodeService";
import { buildBarcodeDraft } from "@/feature/Meals/utils/buildBarcodeDraft";

const BARCODE_PREVIEW_HEIGHT = 280;

export default function BarcodeProductNotFoundScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"BarcodeProductNotFound">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("meals");
  const { t: tCommon } = useTranslation("common");
  const { uid } = useAuthContext();
  const { meal, saveDraft, setMeal } = useMealDraftContext();

  const code = params?.code;
  const isManualCode = params.codeSource === "manual";
  const canStepBack = flow.canGoBack();
  const [manualCode, setManualCode] = useState(code ?? "");
  const [manualError, setManualError] = useState<string | undefined>();
  const [lookupError, setLookupError] = useState<string | undefined>();
  const [lookupLoading, setLookupLoading] = useState(false);
  const topLeftActionStyle = useMemo(
    () => ({
      top: insets.top + theme.spacing.xs,
      left: insets.left + theme.spacing.sm,
    }),
    [insets.left, insets.top, theme.spacing.sm, theme.spacing.xs],
  );
  const previewTopInset = useMemo(
    () =>
      Math.max(
        theme.spacing.xxl,
        Math.round(insets.top * 0.65) + theme.spacing.xs,
      ),
    [insets.top, theme.spacing.xs, theme.spacing.xxl],
  );

  const handleBackToBarcode = useCallback(() => {
    flow.replace("BarcodeScan", {
      code: undefined,
      codeSource: undefined,
    });
  }, [flow]);

  const handleTryAnotherMethod = useCallback(() => {
    navigation.navigate("MealAddMethod", {
      selectionMode: "temporary",
    });
  }, [navigation]);

  const handleEditCode = useCallback(() => {
    flow.replace("BarcodeScan", {
      code,
      codeSource: "manual",
      showManualEntry: true,
    });
  }, [code, flow]);

  const persistBarcodeMeal = useCallback(
    async (
      nextCode: string,
      ingredient: Parameters<typeof buildBarcodeDraft>[0]["ingredient"],
      productName: string,
    ) => {
      const nextMeal = buildBarcodeDraft({
        uid,
        existingMeal: meal,
        mealId: meal?.mealId,
        code: nextCode,
        ingredient,
        productName,
      });

      setMeal(nextMeal);
      if (uid) {
        await saveDraft(uid, nextMeal);
      }
    },
    [meal, saveDraft, setMeal, uid],
  );

  const handleRetryManualLookup = useCallback(async () => {
    const parsed = extractBarcodeFromPayload(manualCode);
    if (!parsed || lookupLoading) {
      if (!parsed) {
        setManualError(
          t("barcode_scan_invalid_code", {
            defaultValue: "Enter a valid barcode to continue.",
          }),
        );
      }
      return;
    }

    setManualCode(parsed);
    setManualError(undefined);
    setLookupError(undefined);
    setLookupLoading(true);

    try {
      const result = await lookupBarcodeProduct(parsed);

      if (result.kind === "not_found") {
        flow.replace("BarcodeProductNotFound", {
          code: parsed,
          codeSource: "manual",
        });
        return;
      }

      if (result.kind === "error") {
        setLookupError(
          t("barcode_scan_lookup_error", {
            defaultValue:
              "We couldn't search this barcode right now. Try again.",
          }),
        );
        return;
      }

      await persistBarcodeMeal(parsed, result.ingredient, result.name);
      flow.replace("ReviewMeal", {});
    } finally {
      setLookupLoading(false);
    }
  }, [
    flow,
    lookupLoading,
    manualCode,
    persistBarcodeMeal,
    t,
  ]);

  useEffect(() => {
    setManualCode(code ?? "");
    setManualError(undefined);
    setLookupError(undefined);
  }, [code]);

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
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.fill}>
        <MealAddPhotoScaffold
          topInset={previewTopInset}
          previewHeight={BARCODE_PREVIEW_HEIGHT}
          preview={
            <MealAddBarcodePreview
              label={
                isManualCode
                  ? t("barcode_scan_sheet_title", {
                      defaultValue: "Enter code",
                    })
                  : t("barcode_scan_detected_badge", {
                      defaultValue: "Detected code",
                    })
              }
              detectedCode={isManualCode ? undefined : code}
            />
          }
          topAction={
            canStepBack ? (
              <ScreenCornerNavButton
                icon="back"
                onPress={handleBackToBarcode}
                accessibilityLabel={tCommon("back", { defaultValue: "Back" })}
                containerStyle={topLeftActionStyle}
              />
            ) : undefined
          }
          eyebrow={t("barcode_scan_eyebrow", {
            defaultValue: "Barcode",
          })}
          title={t("barcode_not_found_title", {
            defaultValue: "We couldn’t find a product for this barcode.",
          })}
          description={
            isManualCode
              ? t("barcode_scan_sheet_subtitle", {
                  defaultValue:
                    "Type the numbers under the bars if scanning is difficult.",
                })
              : t("barcode_not_found_sub", {
                  defaultValue: "This is the code we searched for:",
                })
          }
          content={
            <>
              {isManualCode ? (
                <>
                  <TextInput
                    testID="barcode-not-found-input"
                    value={manualCode}
                    onChangeText={(value) => {
                      setManualCode(value);
                      if (manualError) setManualError(undefined);
                      if (lookupError) setLookupError(undefined);
                    }}
                    keyboardType="number-pad"
                    placeholder={t("barcode_scan_sheet_placeholder", {
                      defaultValue: "Enter numbers only",
                    })}
                    helperText={t("barcode_scan_sheet_helper", {
                      defaultValue:
                        "Numeric input only. Usually 8 to 13 digits.",
                    })}
                    error={manualError}
                    autoCapitalize="none"
                  />
                  {lookupError ? <ErrorBox message={lookupError} /> : null}
                  <Button
                    label={t("barcode_scan_search_cta", {
                      defaultValue: "Search product",
                    })}
                    onPress={() => {
                      void handleRetryManualLookup();
                    }}
                    loading={lookupLoading}
                  />
                  <Button
                    label={t("barcode_not_found_scan_again", {
                      defaultValue: "Back to scan",
                    })}
                    onPress={handleBackToBarcode}
                    variant="secondary"
                    disabled={lookupLoading}
                  />
                  <TextButton
                    label={t("barcode_not_found_try_another_method", {
                      defaultValue: "Try another method",
                    })}
                    onPress={handleTryAnotherMethod}
                    disabled={lookupLoading}
                    tone="link"
                  />
                </>
              ) : (
                <>
                  {code ? (
                    <View style={styles.codeCard}>
                      <Text style={styles.codeLabel}>
                        {t("barcode_searched_code_label", {
                          defaultValue: "Sent code",
                        })}
                      </Text>
                      <Text style={styles.codeValue}>{code}</Text>
                    </View>
                  ) : null}

                  <TextButton
                    label={t("barcode_not_found_try_another_method", {
                      defaultValue: "Try another method",
                    })}
                    onPress={handleTryAnotherMethod}
                    tone="link"
                  />
                  <Button
                    label={t("barcode_not_found_scan_again", {
                      defaultValue: "Back to scan",
                    })}
                    onPress={handleBackToBarcode}
                    variant="secondary"
                  />
                  <MealAddTextLink
                    label={t("barcode_not_found_edit_code", {
                      defaultValue: "Edit code",
                    })}
                    onPress={handleEditCode}
                  />
                </>
              )}
            </>
          }
        />
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    layout: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    fill: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    codeCard: {
      minHeight: 72,
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.surfaceElevated,
      justifyContent: "center",
      gap: 4,
    },
    codeLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.medium,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    codeValue: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.semiBold,
      letterSpacing: 0.3,
    },
  });
