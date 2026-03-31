import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeType,
} from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Button,
  ErrorBox,
  Layout,
  ScreenCornerNavButton,
  TextInput,
} from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";
import type { Ingredient } from "@/types";
import {
  extractBarcodeFromPayload,
  lookupBarcodeProduct,
} from "@/services/barcode/barcodeService";
import type {
  MealAddBarcodeCodeSource,
  MealAddScreenProps,
} from "@/feature/Meals/feature/MapMealAddScreens";
import {
  MealAddPhotoScaffold,
  MealAddStatusBanner,
  MealAddTextLink,
} from "@/feature/Meals/components/MealAddPhotoScaffold";
import { MealAddBarcodePreview } from "@/feature/Meals/components/MealAddBarcodePreview";
import { buildBarcodeDraft } from "@/feature/Meals/utils/buildBarcodeDraft";

const BARCODE_PREVIEW_HEIGHT = 280;

export default function BarcodeScanScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"BarcodeScan">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t: tMeals } = useTranslation("meals");
  const { t: tCommon } = useTranslation("common");
  const [permission, requestPermission] = useCameraPermissions();
  const { uid } = useAuthContext();
  const { meal, saveDraft, setLastScreen, setMeal } = useMealDraftContext();

  const [detectedCode, setDetectedCode] = useState<string | null>(
    params.code ?? null,
  );
  const [codeSource, setCodeSource] = useState<
    MealAddBarcodeCodeSource | undefined
  >(params.codeSource);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(
    Boolean(params.showManualEntry),
  );
  const [manualCode, setManualCode] = useState(params.code ?? "");
  const [manualError, setManualError] = useState<string | undefined>();
  const [lookupError, setLookupError] = useState<string | undefined>();

  const canStepBack = flow.canGoBack();
  const barcodeTypes = useMemo<BarcodeType[]>(
    () => ["ean13", "ean8", "upc_a", "upc_e", "code128", "qr"],
    [],
  );
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

  useEffect(() => {
    setDetectedCode(params.showManualEntry ? null : (params.code ?? null));
    setCodeSource(params.codeSource);
    setManualCode(params.code ?? "");
    setShowManualEntry(Boolean(params.showManualEntry));
    setManualError(undefined);
    setLookupError(undefined);
  }, [params.code, params.codeSource, params.showManualEntry]);

  useEffect(() => {
    if (uid) {
      void setLastScreen(uid, "AddMeal");
    }
  }, [setLastScreen, uid]);

  const dismissManualEntry = useCallback(() => {
    setManualError(undefined);

    setShowManualEntry(false);
  }, []);

  const handleExit = useCallback(() => {
    if (showManualEntry) {
      dismissManualEntry();
      return;
    }

    if (canStepBack) {
      flow.goBack();
      return;
    }

    navigation.goBack();
  }, [canStepBack, dismissManualEntry, flow, navigation, showManualEntry]);

  useEffect(() => {
    const onBackPress = () => {
      handleExit();
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleExit]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      const actionType = e.data.action.type;
      const isBackAction =
        actionType === "GO_BACK" ||
        actionType === "POP" ||
        actionType === "POP_TO_TOP";

      if (!isBackAction) return;

      if (showManualEntry || canStepBack) {
        e.preventDefault();
        handleExit();
      }
    });

    return sub;
  }, [canStepBack, handleExit, navigation, showManualEntry]);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (lookupLoading) return;

      const code = extractBarcodeFromPayload(data);
      if (!code) return;

      setDetectedCode(code);
      setCodeSource("scan");
      setManualCode(code);
      setLookupError(undefined);
      setManualError(undefined);
    },
    [lookupLoading],
  );

  const persistBarcodeMeal = useCallback(
    async (code: string, ingredient: Ingredient, productName: string) => {
      const nextMeal = buildBarcodeDraft({
        uid,
        existingMeal: meal,
        mealId: meal?.mealId,
        code,
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

  const handleLookup = useCallback(
    async (
      codeToSearch?: string,
      codeSourceOverride?: MealAddBarcodeCodeSource,
    ) => {
      const code = codeToSearch ?? detectedCode;
      if (!code || lookupLoading) return;
      const resolvedCodeSource = codeSourceOverride ?? codeSource ?? "scan";

      setLookupLoading(true);
      setLookupError(undefined);

      try {
        const result = await lookupBarcodeProduct(code);

        if (result.kind === "not_found") {
          flow.replace("BarcodeProductNotFound", {
            code,
            codeSource: resolvedCodeSource,
          });
          return;
        }

        if (result.kind === "error") {
          setLookupError(
            tMeals("barcode_scan_lookup_error", {
              defaultValue:
                "We couldn't search this barcode right now. Try again.",
            }),
          );
          return;
        }

        await persistBarcodeMeal(code, result.ingredient, result.name);
        flow.replace("ReviewMeal", {});
      } finally {
        setLookupLoading(false);
      }
    },
    [
      detectedCode,
      flow,
      lookupLoading,
      persistBarcodeMeal,
      codeSource,
      tMeals,
    ],
  );

  const handleOpenManualEntry = useCallback(() => {
    setManualCode(detectedCode ?? "");
    setManualError(undefined);
    setCodeSource("manual");

    setShowManualEntry(true);
  }, [detectedCode]);

  const handleSubmitManualCode = useCallback(() => {
    const parsed = extractBarcodeFromPayload(manualCode);
    if (!parsed) {
      setManualError(
        tMeals("barcode_scan_invalid_code", {
          defaultValue: "Enter a valid barcode to continue.",
        }),
      );
      return;
    }

    setManualCode(parsed);
    setManualError(undefined);

    void handleLookup(parsed, "manual");
  }, [handleLookup, manualCode, tMeals]);

  const handleChangeMethod = useCallback(() => {
    navigation.navigate("MealAddMethod", {
      selectionMode: "temporary",
      origin: "mealAddFlow",
    });
  }, [navigation]);

  const previewLabel = detectedCode
    ? tMeals("barcode_scan_detected_badge", {
        defaultValue: "Detected code",
      })
    : tMeals("barcode_scan_preview_label", {
        defaultValue: "Place the code inside the frame",
      });
  const title = detectedCode
    ? tMeals("barcode_scan_detected_title", {
        defaultValue: "Barcode detected",
      })
    : tMeals("barcode_scan_title", {
        defaultValue: "Scan barcode",
      });
  const description = detectedCode
    ? tMeals("barcode_scan_detected_subtitle", {
        defaultValue:
          "We found a barcode. Search for the product or edit the code first.",
      })
    : tMeals("barcode_scan_subtitle", {
        defaultValue:
          "Point the camera at the barcode. We will ask you to confirm the number before searching.",
      });

  if (!permission) {
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <View style={styles.flexBackground} />
      </Layout>
    );
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionTitle}>
            {tCommon("camera_permission_title")}
          </Text>
          <Text style={styles.permissionSubtitle}>
            {blocked
              ? tMeals(
                  "barcode_camera_permission_blocked_message",
                  "Enable camera access in settings to scan barcodes.",
                )
              : tCommon("camera_permission_message")}
          </Text>
          <Button
            label={tCommon("continue")}
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
            style={styles.permissionButton}
          />
        </View>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.fill}>
        <MealAddPhotoScaffold
          topInset={previewTopInset}
          previewHeight={BARCODE_PREVIEW_HEIGHT}
          preview={
            <MealAddBarcodePreview
              label={previewLabel}
              detectedCode={detectedCode}
            >
              <CameraView
                style={styles.camera}
                onBarcodeScanned={
                  lookupLoading ? undefined : handleBarcodeScanned
                }
                barcodeScannerSettings={{ barcodeTypes }}
              />
            </MealAddBarcodePreview>
          }
          topAction={
            canStepBack ? (
              <ScreenCornerNavButton
                icon="back"
                onPress={handleExit}
                accessibilityLabel={tCommon("back", { defaultValue: "Back" })}
                containerStyle={topLeftActionStyle}
              />
            ) : undefined
          }
          eyebrow={tMeals("barcode_scan_eyebrow", {
            defaultValue: "Barcode",
          })}
          title={title}
          description={description}
          content={
            <>
              {!detectedCode ? (
                <MealAddStatusBanner
                  label={tMeals("barcode_scan_status", {
                    defaultValue: "Scanning for a code",
                  })}
                />
              ) : null}

              {lookupError ? <ErrorBox message={lookupError} /> : null}

              {detectedCode ? (
                <Button
                  label={tMeals("barcode_scan_search_cta", {
                    defaultValue: "Search product",
                  })}
                  onPress={() => {
                    void handleLookup();
                  }}
                  loading={lookupLoading}
                />
              ) : null}

              <Button
                label={tMeals("barcode_scan_manual_cta", {
                  defaultValue: "Enter code manually",
                })}
                onPress={handleOpenManualEntry}
                variant="secondary"
                disabled={lookupLoading}
              />

              <MealAddTextLink
                label={tMeals("change_method", {
                  defaultValue: "Change add method",
                })}
                onPress={handleChangeMethod}
              />
            </>
          }
        />

        {showManualEntry ? (
          <View style={styles.manualOverlay}>
            <Pressable
              style={styles.manualBackdrop}
              onPress={dismissManualEntry}
            />

            <View style={styles.manualSheet}>
              <View style={styles.sheetHandle} />

              <Text style={styles.manualTitle}>
                {tMeals("barcode_scan_sheet_title", {
                  defaultValue: "Enter code",
                })}
              </Text>
              <Text style={styles.manualSubtitle}>
                {tMeals("barcode_scan_sheet_subtitle", {
                  defaultValue:
                    "Type the numbers under the bars if scanning is difficult.",
                })}
              </Text>

              <TextInput
                testID="barcode-manual-input"
                value={manualCode}
                onChangeText={(value) => {
                  setManualCode(value);
                  if (manualError) setManualError(undefined);
                }}
                keyboardType="number-pad"
                placeholder={tMeals("barcode_scan_sheet_placeholder", {
                  defaultValue: "Enter numbers only",
                })}
                helperText={tMeals("barcode_scan_sheet_helper", {
                  defaultValue: "Numeric input only. Usually 8 to 13 digits.",
                })}
                error={manualError}
                autoCapitalize="none"
              />

              <View style={styles.manualActions}>
                <Button
                  label={tMeals("barcode_scan_search_cta", {
                    defaultValue: "Search product",
                  })}
                  onPress={handleSubmitManualCode}
                  loading={lookupLoading}
                />
                <Button
                  label={tMeals("barcode_scan_back_to_scan", {
                    defaultValue: "Back to scan",
                  })}
                  onPress={dismissManualEntry}
                  variant="secondary"
                  disabled={lookupLoading}
                />
              </View>
            </View>
          </View>
        ) : null}
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
    flexBackground: {
      flex: 1,
      backgroundColor: theme.background,
    },
    camera: {
      flex: 1,
    },
    permissionWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
      backgroundColor: theme.background,
      gap: theme.spacing.sm,
    },
    permissionTitle: {
      fontSize: theme.typography.size.bodyM,
      textAlign: "center",
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    permissionSubtitle: {
      fontSize: theme.typography.size.bodyL,
      textAlign: "center",
      color: theme.textSecondary,
      maxWidth: 320,
    },
    permissionButton: {
      alignSelf: "stretch",
    },
    manualOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      zIndex: 20,
    },
    manualBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(19, 23, 19, 0.42)",
    },
    manualSheet: {
      borderTopLeftRadius: theme.rounded.xxl,
      borderTopRightRadius: theme.rounded.xxl,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
      backgroundColor: theme.surface,
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -4 },
      elevation: 8,
    },
    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      alignSelf: "center",
      backgroundColor: theme.border,
    },
    manualTitle: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
    manualSubtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "center",
    },
    manualActions: {
      gap: theme.spacing.sm,
    },
  });
