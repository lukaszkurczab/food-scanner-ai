import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { RouteProp, useRoute } from "@react-navigation/native";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { RootStackParamList } from "@/navigation/navigate";
import type { Meal } from "@/types/meal";
import { PrimaryButton } from "@/components/PrimaryButton";
import { MaterialIcons } from "@expo/vector-icons";
import ShareCanvas from "@/components/share/ShareCanvas";
import ShareEditorPanel, {
  ShareEditorMode,
} from "@/components/share/ShareEditorPanel";
import { defaultShareOptions } from "@/types/share";

type ScreenRoute = RouteProp<RootStackParamList, "MealShare">;

export default function MealShareScreen() {
  const theme = useTheme();
  const route = useRoute<ScreenRoute>();
  const { meal } = route.params;
  const { width, height } = useWindowDimensions();
  const shotRef = useRef<View>(null);

  const [opts, setOpts] = useState({
    ...defaultShareOptions,
    bgColor: "#000000",
  } as any);
  const [panelMode, setPanelMode] = useState<ShareEditorMode | null>(null);
  const [uiHidden, setUiHidden] = useState(false);

  const nutrition = useMemo(
    () => calculateTotalNutrients([meal as Meal]),
    [meal]
  );

  const wait = (ms = 0) => new Promise((res) => setTimeout(res, ms));

  const share = async () => {
    if (!shotRef.current) return;
    setUiHidden(true);
    await wait(50);
    const uri = await captureRef(shotRef, {
      format: "png",
      quality: 1,
      width: Math.round(width),
      height: Math.round(height),
      result: "tmpfile",
    });
    setUiHidden(false);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  const openMode = (m: ShareEditorMode) =>
    setPanelMode((prev) => (prev === m ? null : m));

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ViewShot ref={shotRef} style={{ flex: 1 }}>
        <ShareCanvas
          width={Math.round(width)}
          height={Math.round(height)}
          photoUri={meal.photoUrl || null}
          title={meal.name || ""}
          kcal={nutrition.kcal}
          protein={nutrition.protein}
          fat={nutrition.fat}
          carbs={nutrition.carbs}
          options={opts as any}
          onChange={setOpts as any}
          uiHidden={uiHidden}
        />
      </ViewShot>

      {!uiHidden && (
        <>
          <View style={[styles.rightBar, { top: 24 }]}>
            <Pressable
              onPress={() => openMode("text")}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              hitSlop={8}
            >
              <MaterialIcons name="text-fields" size={22} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => openMode("chart")}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              hitSlop={8}
            >
              <MaterialIcons
                name="insert-chart-outlined"
                size={22}
                color={theme.text}
              />
            </Pressable>
            <Pressable
              onPress={() => openMode("background")}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              hitSlop={8}
            >
              <MaterialIcons name="color-lens" size={22} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.shareWrap}>
            <PrimaryButton label="Share" onPress={share} />
          </View>
        </>
      )}

      <ShareEditorPanel
        visible={!!panelMode && !uiHidden}
        mode={panelMode}
        options={opts as any}
        onChange={setOpts as any}
        onClose={() => setPanelMode(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rightBar: {
    position: "absolute",
    right: 12,
    gap: 8,
    zIndex: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shareWrap: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
});
