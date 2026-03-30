import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera";
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
import type { Ingredient, Meal } from "@/types";
import {
  extractBarcodeFromPayload,
  lookupBarcodeProduct,
} from "@/services/barcode/barcodeService";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";

function buildBarcodeDraft(params: {
  uid: string | null;
  existingMeal: Meal | null;
  mealId?: string;
  code: string;
  ingredient: Ingredient;
  productName: string;
}): Meal {
  const now = new Date().toISOString();
  const nextBase = params.existingMeal ?? {
    mealId: params.mealId ?? `barcode-${Date.now()}`,
    userUid: params.uid ?? "",
    name: null,
    photoUrl: null,
    ingredients: [],
    createdAt: now,
    updatedAt: now,
    syncState: "pending" as const,
    tags: [],
    deleted: false,
    notes: null,
    type: "other" as const,
    timestamp: "",
    source: null,
    inputMethod: "barcode" as const,
    aiMeta: null,
  };

  return {
    ...nextBase,
    mealId: nextBase.mealId ?? params.mealId ?? `barcode-${Date.now()}`,
    userUid: nextBase.userUid ?? params.uid ?? "",
    name: params.productName || nextBase.name,
    ingredients: [params.ingredient],
    timestamp: nextBase.timestamp || now,
    photoUrl: null,
    photoLocalPath: null,
    localPhotoUrl: null,
    imageId: null,
    notes: `barcode:${params.code}`,
    source: "manual",
    inputMethod: "barcode",
    aiMeta: null,
    updatedAt: now,
  };
}

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

  useEffect(() => {
    setDetectedCode(params.code ?? null);
    setManualCode(params.code ?? "");
    setShowManualEntry(Boolean(params.showManualEntry));
    setManualError(undefined);
    setLookupError(undefined);
  }, [params.code, params.showManualEntry]);

  useEffect(() => {
    if (uid) {
      void setLastScreen(uid, "AddMeal");
    }
  }, [setLastScreen, uid]);

  const dismissManualEntry = useCallback(() => {
    setShowManualEntry(false);
    setManualError(undefined);
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
      if (lookupLoading || detectedCode) return;

      const code = extractBarcodeFromPayload(data);
      if (!code) return;

      setDetectedCode(code);
      setManualCode(code);
      setLookupError(undefined);
      setManualError(undefined);
    },
    [detectedCode, lookupLoading],
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
    async (codeToSearch?: string) => {
      const code = codeToSearch ?? detectedCode;
      if (!code || lookupLoading) return;

      setLookupLoading(true);
      setLookupError(undefined);

      try {
        const result = await lookupBarcodeProduct(code);

        if (result.kind === "not_found") {
          flow.replace("BarcodeProductNotFound", { code });
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
    [detectedCode, flow, lookupLoading, persistBarcodeMeal, tMeals],
  );

  const handleOpenManualEntry = useCallback(() => {
    setShowManualEntry(true);
    setManualCode(detectedCode ?? "");
    setManualError(undefined);
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

    setDetectedCode(parsed);
    setManualCode(parsed);
    setManualError(undefined);
    setShowManualEntry(false);
    void handleLookup(parsed);
  }, [handleLookup, manualCode, tMeals]);

  const handleRescan = useCallback(() => {
    setDetectedCode(null);
    setLookupError(undefined);
  }, []);

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
        <CameraView
          style={styles.camera}
          onBarcodeScanned={detectedCode ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes }}
        />

        <View style={StyleSheet.absoluteFill}>
          <ScreenCornerNavButton
            icon={canStepBack ? "back" : "close"}
            onPress={handleExit}
            accessibilityLabel={
              canStepBack
                ? tCommon("back", { defaultValue: "Back" })
                : tCommon("close", { defaultValue: "Close" })
            }
            containerStyle={topLeftActionStyle}
          />

          <View pointerEvents="none" style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
          </View>

          <View style={styles.bottomPanel}>
            <View style={styles.panelCard}>
              <Text style={styles.panelEyebrow}>
                {detectedCode
                  ? tMeals("barcode_scan_detected_label", {
                      defaultValue: "Code detected",
                    })
                  : tMeals("barcode_scan_eyebrow", {
                      defaultValue: "Scan barcode",
                    })}
              </Text>
              <Text style={styles.panelTitle}>
                {detectedCode
                  ? detectedCode
                  : tMeals("barcode_scan_title", {
                      defaultValue: "Point the camera at the barcode",
                    })}
              </Text>
              <Text style={styles.panelSubtitle}>
                {detectedCode
                  ? tMeals("barcode_scan_detected_subtitle", {
                      defaultValue:
                        "Check the code before you search for the product.",
                    })
                  : tMeals("barcode_scan_subtitle", {
                      defaultValue:
                        "Keep the code inside the frame. You can also enter it manually.",
                    })}
              </Text>
              <ErrorBox message={lookupError ?? ""} />
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

              <View style={styles.inlineActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleOpenManualEntry}
                  style={({ pressed }) => [
                    styles.inlineAction,
                    pressed ? styles.inlineActionPressed : null,
                  ]}
                >
                  <Text style={styles.inlineActionLabel}>
                    {tMeals("barcode_scan_manual_cta", {
                      defaultValue: "Enter code manually",
                    })}
                  </Text>
                </Pressable>

                {detectedCode ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleRescan}
                    style={({ pressed }) => [
                      styles.inlineAction,
                      pressed ? styles.inlineActionPressed : null,
                    ]}
                  >
                    <Text style={styles.inlineActionLabel}>
                      {tMeals("barcode_scan_rescan_cta", {
                        defaultValue: "Scan another code",
                      })}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          {showManualEntry ? (
            <View style={styles.sheetOverlay}>
              <Pressable style={styles.sheetBackdrop} onPress={dismissManualEntry} />
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>
                  {tMeals("barcode_scan_sheet_title", {
                    defaultValue: "Enter barcode manually",
                  })}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {tMeals("barcode_scan_sheet_subtitle", {
                    defaultValue:
                      "Type the code you want to search and continue when it looks right.",
                  })}
                </Text>
                <TextInput
                  label={tMeals("barcode_scan_sheet_input_label", {
                    defaultValue: "Barcode",
                  })}
                  testID="barcode-manual-input"
                  value={manualCode}
                  onChangeText={(value) => {
                    setManualCode(value);
                    if (manualError) setManualError(undefined);
                  }}
                  keyboardType="number-pad"
                  placeholder={tMeals("barcode_scan_sheet_placeholder", {
                    defaultValue: "5901234123457",
                  })}
                  autoCapitalize="none"
                />
                <ErrorBox message={manualError ?? ""} />
                <Button
                  label={tMeals("barcode_scan_search_cta", {
                    defaultValue: "Search product",
                  })}
                  onPress={handleSubmitManualCode}
                  loading={lookupLoading}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={dismissManualEntry}
                  style={({ pressed }) => [
                    styles.sheetDismiss,
                    pressed ? styles.inlineActionPressed : null,
                  ]}
                >
                  <Text style={styles.sheetDismissLabel}>
                    {tCommon("cancel", { defaultValue: "Cancel" })}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) => {
  const overlayCard = theme.isDark
    ? "rgba(0, 0, 0, 0.58)"
    : "rgba(17, 24, 39, 0.62)";
  const overlayStroke = "rgba(255, 255, 255, 0.88)";
  const overlayPrimaryText = "rgba(255, 255, 255, 0.96)";
  const overlaySecondaryText = "rgba(255, 255, 255, 0.78)";

  return StyleSheet.create({
    layout: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
    fill: {
      flex: 1,
      backgroundColor: theme.background,
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
      marginTop: theme.spacing.xs,
    },
    scanOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    scanFrame: {
      width: "78%",
      maxWidth: 332,
      aspectRatio: 2.4,
      borderRadius: theme.rounded.xl,
      borderWidth: 3,
      borderColor: overlayStroke,
      backgroundColor: "transparent",
    },
    bottomPanel: {
      position: "absolute",
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      bottom: theme.spacing.xl,
    },
    panelCard: {
      borderRadius: theme.rounded.xl,
      backgroundColor: overlayCard,
      padding: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    panelEyebrow: {
      color: overlaySecondaryText,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    panelTitle: {
      color: overlayPrimaryText,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
    },
    panelSubtitle: {
      color: overlaySecondaryText,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      marginBottom: theme.spacing.sm,
    },
    inlineActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    inlineAction: {
      minHeight: 36,
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    inlineActionPressed: {
      opacity: 0.72,
    },
    inlineActionLabel: {
      color: overlayPrimaryText,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    sheetOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.isDark
        ? "rgba(0, 0, 0, 0.48)"
        : "rgba(47, 49, 43, 0.42)",
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: theme.rounded.xl,
      borderTopRightRadius: theme.rounded.xl,
      paddingTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.4 : 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.border,
      alignSelf: "center",
    },
    sheetTitle: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
      marginTop: theme.spacing.xs,
    },
    sheetSubtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
    },
    sheetDismiss: {
      alignSelf: "center",
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    sheetDismissLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });
};
