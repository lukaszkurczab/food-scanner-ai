import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import { CameraView } from "expo-camera";
import { useTheme } from "@/theme/useTheme";
import Loader from "@feature/Meals/components/Loader";
import { useTranslation } from "react-i18next";
import { Layout, PhotoPreview } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";
import { Alert as AppAlert } from "@/components/Alert";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { useMealCameraState } from "@/feature/Meals/hooks/useMealCameraState";

export default function MealCameraScreen({
  navigation,
  flow,
  params,
}: MealAddScreenProps<"MealCamera">) {
  const theme = useTheme();
  const { t: tCommon } = useTranslation("common");
  const { t: tMeals } = useTranslation("meals");

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
    isPremium,
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

  if (!permission) {
    return (
      <Layout>
        <View style={{ flex: 1, backgroundColor: theme.background }} />
      </Layout>
    );
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;
    return (
      <Layout>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: theme.background,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              textAlign: "center",
              marginBottom: 12,
              color: theme.text,
              fontWeight: "700",
            }}
          >
            {tCommon("camera_permission_title")}
          </Text>

          <Text
            style={{
              fontSize: 16,
              textAlign: "center",
              marginBottom: 20,
              color: theme.text,
              opacity: 0.9,
            }}
          >
            {blocked
              ? tMeals("camera_permission_blocked_message")
              : tCommon("camera_permission_message")}
          </Text>

          <Pressable
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 32,
              borderRadius: 32,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 16, color: theme.text }}>
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
      <Layout>
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
      <Layout>
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
    <Layout>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            onCameraReady={() => setIsCameraReady(true)}
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes,
            }}
          />
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.overlay} pointerEvents="none" />
            {!skipDetection && !barcodeOnly && (
              <View style={styles.modeSwitch}>
                <Pressable
                  onPress={openAiMode}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        mode === "ai" ? theme.accentSecondary : theme.card,
                      borderColor: theme.border,
                      opacity: isPremium ? 1 : 0.6,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="psychology"
                    size={22}
                    color={mode === "ai" ? theme.onAccent : theme.text}
                  />
                </Pressable>
                <Pressable
                  onPress={openBarcodeMode}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        mode === "barcode" ? theme.accentSecondary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={22}
                    color={mode === "barcode" ? theme.onAccent : theme.text}
                  />
                </Pressable>
              </View>
            )}
            {showBarcodeOverlay && (
              <View pointerEvents="none" style={styles.barcodeOverlay}>
                <View
                  style={[styles.barcodeFrame, { borderColor: theme.onAccent }]}
                />
                <View
                  style={[
                    styles.barcodeHintCard,
                    {
                      borderColor: theme.border,
                      top: "50%",
                      transform: [{ translateY: -144 }],
                    },
                  ]}
                >
                  <Text
                    style={[styles.barcodeHintText, { color: theme.onAccent }]}
                  >
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
                  style={[
                    styles.devBtn,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={{ color: theme.text }}>
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
        title={tMeals("premium_required_title", {
          defaultValue: "Premium required",
        })}
        message={tMeals("premium_required_body", {
          defaultValue: "AI mode requires a Premium subscription.",
        })}
        onClose={closePremiumModal}
        primaryAction={{
          label: tMeals("go_premium", { defaultValue: "Go Premium" }),
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  modeSwitch: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  modeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
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
    top: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-start",
  },
  devBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  barcodeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  barcodeHintCard: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  barcodeHintText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  barcodeFrame: {
    width: "78%",
    aspectRatio: 1.6,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
});
