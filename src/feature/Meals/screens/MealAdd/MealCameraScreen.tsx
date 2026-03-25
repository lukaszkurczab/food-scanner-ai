import { useMemo } from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import { CameraView } from "expo-camera";
import { useTheme } from "@/theme/useTheme";
import Loader from "@feature/Meals/components/Loader";
import { useTranslation } from "react-i18next";
import { Layout, PhotoPreview, ScreenCornerNavButton } from "@/components";
import AppIcon from "@/components/AppIcon";
import { Alert as AppAlert } from "@/components/Alert";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useMealCameraState } from "@/feature/Meals/hooks/useMealCameraState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";

export default function MealCameraScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"MealCamera">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t: tCommon } = useTranslation("common");
  const { t: tMeals } = useTranslation("meals");
  const { t: tChat } = useTranslation("chat");
  const canStepBack = flow.canGoBack();
  const topLeftActionStyle = useMemo(
    () => ({
      top: insets.top + theme.spacing.xs,
      left: insets.left + theme.spacing.sm,
    }),
    [insets.left, insets.top, theme.spacing.sm, theme.spacing.xs],
  );
  const topRightActionStyle = useMemo(
    () => ({
      top: insets.top + theme.spacing.xs,
      right: insets.right + theme.spacing.sm,
    }),
    [insets.right, insets.top, theme.spacing.sm, theme.spacing.xs],
  );

  const {
    permission,
    requestPermission,
    cameraRef,
    isCameraReady,
    isTakingPhoto,
    photoUri,
    isLoading,
    premiumModal,
    barcodeModal,
    scannedCode,
    mode,
    canUsePhotoAi,
    skipDetection,
    barcodeOnly,
    showBarcodeOverlay,
    barcodeTypes,
    setIsCameraReady,
    handleTakePicture,
    handleAccept,
    handleRetake,
    onBarcodeScanned,
    onUseSample,
    openAiMode,
    openBarcodeMode,
    closePremiumModal,
    closeBarcodeModal,
    goManagePremium,
  } = useMealCameraState({ navigation, flow, params });

  const handleTopLeftPress = () => {
    if (canStepBack) {
      flow.goBack();
      return;
    }
    navigation.goBack();
  };

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
              ? tMeals("camera_permission_blocked_message")
              : tCommon("camera_permission_message")}
          </Text>

          <Pressable
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonLabel}>
              {tCommon("continue")}
            </Text>
          </Pressable>
        </View>
      </Layout>
    );
  }

  if (isLoading) {
    const isBarcodeFlow = mode === "barcode" && !skipDetection;
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <Loader
          text={
            isBarcodeFlow
              ? tCommon("barcode_loader_title", "Looking up product...")
              : tCommon("camera_loader_title", "Analyzing your meal...")
          }
          subtext={
            isBarcodeFlow
              ? tCommon(
                  "barcode_loader_subtext",
                  "Fetching product data from the database.",
                )
              : tCommon("camera_loader_subtext", "This may take a few seconds.")
          }
        />
      </Layout>
    );
  }

  if (photoUri) {
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <PhotoPreview
          photoUri={photoUri}
          onRetake={handleRetake}
          onAccept={handleAccept}
          isLoading={isLoading}
          secondaryText={tCommon("camera_retake")}
          primaryText={tCommon("camera_use_photo")}
        />
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.fill}>
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onCameraReady={() => setIsCameraReady(true)}
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes,
            }}
          />
          <View style={StyleSheet.absoluteFill}>
            <ScreenCornerNavButton
              icon={canStepBack ? "back" : "close"}
              onPress={handleTopLeftPress}
              accessibilityLabel={
                canStepBack
                  ? tCommon("back", { defaultValue: "Back" })
                  : tCommon("close", { defaultValue: "Close" })
              }
              tone="camera"
              containerStyle={topLeftActionStyle}
            />
            {!skipDetection && (
              <View style={[styles.creditsBadgePosition, topRightActionStyle]}>
                <AiCreditsBadge
                  text={tChat("credits.costMultiple", { count: 5 })}
                />
              </View>
            )}
            {!skipDetection && !barcodeOnly && (
              <View style={styles.modeSwitch}>
                <Pressable
                  onPress={openAiMode}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        mode === "ai"
                          ? theme.primary
                          : theme.surfaceElevated,
                      borderColor: theme.border,
                      opacity: canUsePhotoAi ? 1 : 0.6,
                    },
                  ]}
                >
                  <AppIcon
                    name="sparkles"
                    size={22}
                    color={mode === "ai" ? theme.cta.primaryText : theme.text}
                  />
                </Pressable>
                <Pressable
                  onPress={openBarcodeMode}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        mode === "barcode"
                          ? theme.primary
                          : theme.surfaceElevated,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <AppIcon
                    name="scan-barcode"
                    size={22}
                    color={mode === "barcode" ? theme.cta.primaryText : theme.text}
                  />
                </Pressable>
              </View>
            )}
            {showBarcodeOverlay && (
              <View pointerEvents="none" style={styles.barcodeOverlay}>
                <View style={styles.barcodeFrame} />
                <View
                  style={[styles.barcodeHintCard, styles.barcodeHintPosition]}
                >
                  <Text style={styles.barcodeHintText}>
                    {scannedCode
                      ? tMeals("barcode_detected", {
                          defaultValue: "Detected:",
                        }) + ` ${scannedCode}`
                      : tCommon("barcode_hint", {
                          defaultValue:
                            "Scan the barcode by placing it inside the frame",
                        })}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.shutterWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.shutterButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleTakePicture}
                disabled={isTakingPhoto || !isCameraReady}
              />
            </View>
            {typeof __DEV__ !== "undefined" && __DEV__ && (
              <View style={styles.devRow}>
                <Pressable
                  onPress={() => void onUseSample()}
                  style={styles.devBtn}
                >
                  <Text style={styles.devBtnText}>
                    {tMeals("dev.sample_meal")}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
      <AppAlert
        visible={premiumModal}
        title={tChat("limit.reachedTitle")}
        message={tChat("limit.photoRequired", {
          cost: 5,
        })}
        onClose={closePremiumModal}
        primaryAction={{
          label: tChat("limit.upgradeCta"),
          onPress: goManagePremium,
        }}
        secondaryAction={{
          label: tCommon("cancel"),
          onPress: closePremiumModal,
        }}
      />
      <AppAlert
        visible={barcodeModal}
        title={tMeals("barcode_no_code_title", {
          defaultValue: "No barcode detected",
        })}
        message={tMeals("barcode_no_code_msg", {
          defaultValue:
            "Place the code in the frame and try again, then press the button.",
        })}
        onClose={closeBarcodeModal}
        primaryAction={{
          label: tCommon("confirm", { defaultValue: "OK" }),
          onPress: closeBarcodeModal,
        }}
      />
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
    fill: { flex: 1 },
    flexBackground: { flex: 1, backgroundColor: theme.background },
    cameraWrap: { flex: 1, backgroundColor: theme.background },
    camera: { flex: 1 },
    permissionWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
      backgroundColor: theme.background,
    },
    permissionTitle: {
      fontSize: theme.typography.size.bodyM,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    permissionSubtitle: {
      fontSize: theme.typography.size.bodyL,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
      color: theme.text,
      opacity: 0.9,
    },
    permissionButton: {
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg + theme.spacing.xs,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.surfaceElevated,
    },
    permissionButtonLabel: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyL,
      color: theme.text,
    },
    modeSwitch: {
      position: "absolute",
      bottom: 120,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    modeBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: theme.spacing.xs,
    },
    creditsBadgePosition: {
      position: "absolute",
    },
    shutterWrapper: {
      position: "absolute",
      bottom: 48,
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    shutterButton: {
      borderColor: "white",
      width: 68,
      height: 68,
      borderRadius: 34,
      borderWidth: 4,
      backgroundColor: "transparent",
    },
    devRow: {
      position: "absolute",
      top: theme.spacing.md,
      left: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-start",
    },
    devBtn: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    devBtnText: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
    },
    barcodeOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    barcodeHintCard: {
      position: "absolute",
      left: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderColor: theme.border,
    },
    barcodeHintPosition: {
      top: "50%",
      transform: [{ translateY: -144 }],
    },
    barcodeHintText: {
      fontSize: theme.typography.size.bodyS,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      color: theme.cta.primaryText,
    },
    barcodeFrame: {
      width: "78%",
      aspectRatio: 1.6,
      borderRadius: 18,
      borderWidth: 2,
      backgroundColor: "rgba(0,0,0,0.18)",
      borderColor: theme.cta.primaryText,
    },
  });
