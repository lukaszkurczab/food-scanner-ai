import React, { useRef, useState } from "react";
import { View, StyleSheet, Text, Pressable, ViewStyle } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTheme } from "@/theme/useTheme";
import { Layout } from "@/components";
import { useTranslation } from "react-i18next";
import { fetchProductByBarcode, extractBarcodeFromPayload } from "@/services/barcodeService";
import { DeviceEventEmitter } from "react-native";

export default function BarCodeCameraScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation("common");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

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
        <View style={getCenterStyle(theme)}>
          <Text style={{ color: theme.text, fontSize: 18, marginBottom: 16 }}>
            {t("camera_permission_message")}
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, backgroundColor: theme.card }}
          >
            <Text style={{ color: theme.text, fontWeight: "bold" }}>
              {t("camera_grant_access")}
            </Text>
          </Pressable>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          onBarcodeScanned={async ({ data }: { data: string }) => {
            if (scanned) return;
            if (!data) return;
            const code = extractBarcodeFromPayload(data);
            if (!code) return;
            setScanned(true);
            const off = await fetchProductByBarcode(code);
            if (off?.ingredient) {
              DeviceEventEmitter.emit("barcode.scanned.ingredient", {
                ingredient: off.ingredient,
              });
            }
            navigation.goBack();
          }}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr", "code128"],
          } as any}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", inset: 0 },
});

const getCenterStyle = (theme: any): ViewStyle => ({
  flex: 1,
  justifyContent: "center" as const,
  alignItems: "center" as const,
  backgroundColor: theme.background,
});
