import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import Loader from "@feature/Meals/components/Loader";
import { useTranslation } from "react-i18next";
import {
  fetchProductByBarcode,
  extractBarcodeFromPayload,
} from "@/services/barcodeService";
import { useAuthContext } from "@/context/AuthContext";
import { Layout } from "@/components";
import { Alert as AppAlert } from "@/components/Alert";
import { MaterialIcons } from "@expo/vector-icons";
import { debugScope } from "@/utils/debug";
import type { RootStackParamList } from "@/navigation/navigate";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";

const log = debugScope("Screen:BarCodeCamera");

type Navigation = StackNavigationProp<RootStackParamList, "BarCodeCamera">;

export default function BarCodeCameraScreen() {
  const theme = useTheme();
  const { t } = useTranslation("common");
  const navigation = useNavigation<Navigation>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [barcodeModal, setBarcodeModal] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const { meal, setMeal, updateMeal } = useMealDraftContext();
  const { uid } = useAuthContext();

  const handleConfirmBarcode = async () => {
    const code = scannedCode;
    if (!code) {
      setBarcodeModal(true);
      return;
    }

    log.log("barcode confirm", { code });
    const mealId = meal?.mealId || uuidv4();

    setIsLoading(true);
    try {
      const off = await fetchProductByBarcode(code);
      const name = off?.name || `Barcode ${code}`;

      if (!meal) {
        setMeal({
          mealId,
          userUid: uid || "",
          name,
          photoUrl: null,
          ingredients: off ? [off.ingredient] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncState: "pending",
          tags: [],
          deleted: false,
          notes: `barcode:${code}`,
          type: "other",
          timestamp: "",
          source: "manual",
          cloudId: undefined,
        } as any);
      } else {
        updateMeal({
          mealId,
          name,
          notes: `barcode:${code}`,
          ingredients: off ? [off.ingredient] : meal.ingredients || [],
        } as any);
      }

      navigation.replace("ReviewIngredients");
    } finally {
      setIsLoading(false);
    }
  };

  if (!permission) {
    return (
      <Layout>
        <View style={{ flex: 1, backgroundColor: theme.background }} />
      </Layout>
    );
  }

  if (!permission.granted) {
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
              marginBottom: 20,
              color: theme.text,
            }}
          >
            {t("camera_permission_message")}
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 32,
              borderRadius: 32,
              backgroundColor: theme.card,
            }}
          >
            <Text
              style={{ fontWeight: "bold", fontSize: 16, color: theme.text }}
            >
              {t("camera_grant_access")}
            </Text>
          </Pressable>
        </View>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <Loader
          text={t("camera_loader_title", "Analyzing your meal...")}
          subtext={t("camera_loader_subtext", "This may take a few seconds.")}
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
            onBarcodeScanned={({ data }: { data: string }) => {
              if (!data) return;
              const code = extractBarcodeFromPayload(data);
              if (!code) return;
              setScannedCode((prev) => (prev === code ? prev : code));
            }}
            barcodeScannerSettings={
              {
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "qr",
                  "code128",
                ],
              } as any
            }
          />
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.overlay} pointerEvents="none" />
            <View style={styles.shutterWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.shutterButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleConfirmBarcode}
                disabled={!isCameraReady || isLoading}
              />
            </View>
            {scannedCode && (
              <View style={styles.detectBadge}>
                <Text style={{ color: theme.onAccent, fontWeight: "bold" }}>
                  {t("barcode_detected", { defaultValue: "Detected:" })}{" "}
                  {scannedCode}
                </Text>
              </View>
            )}
            <View style={styles.iconHint}>
              <MaterialIcons
                name="qr-code-scanner"
                size={24}
                color={theme.onAccent}
              />
              <Text style={{ color: theme.onAccent, marginLeft: 8 }}>
                {t("barcode_hint", {
                  defaultValue: "Place the code in the frame",
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <AppAlert
        visible={barcodeModal}
        title={t("barcode_no_code_title", {
          defaultValue: "No barcode detected",
        })}
        message={t("barcode_no_code_msg", {
          defaultValue:
            "Place the code in the frame and try again, then press the button.",
        })}
        onClose={() => setBarcodeModal(false)}
        primaryAction={{
          label: t("ok", { defaultValue: "OK" }),
          onPress: () => setBarcodeModal(false),
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
  detectBadge: {
    position: "absolute",
    bottom: 120,
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  iconHint: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
