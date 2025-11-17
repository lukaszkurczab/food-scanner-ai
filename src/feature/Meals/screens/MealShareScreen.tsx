import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { RouteProp, useRoute } from "@react-navigation/native";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import type { RootStackParamList } from "@/navigation/navigate";
import { PrimaryButton } from "@/components/PrimaryButton";
import { MaterialIcons } from "@expo/vector-icons";
import ShareCanvas from "@feature/Meals/share/ShareCanvas";
import ShareEditorPanel, {
  ShareEditorMode,
} from "@feature/Meals/share/ShareEditorPanel";
import { defaultShareOptions } from "../share/defaultShareOptions";

type ScreenRoute = RouteProp<RootStackParamList, "MealShare">;

export default function MealShareScreen() {
  const theme = useTheme();
  const route = useRoute<ScreenRoute>();
  const { meal } = route.params;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const shotRef = useRef<View>(null);

  const [opts, setOpts] = useState({
    ...defaultShareOptions,
  } as any);
  const [panelMode, setPanelMode] = useState<ShareEditorMode | null>(null);
  const [uiHidden, setUiHidden] = useState(false);

  const nutrition = meal.totals ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 };

  const { canvasWidth, canvasHeight } = useMemo(() => {
    const aspectW = 9;
    const aspectH = 16;
    const targetRatio = aspectW / aspectH;
    const screenRatio = screenWidth / screenHeight;

    let w: number;
    let h: number;

    if (screenRatio > targetRatio) {
      h = screenHeight;
      w = Math.round(screenHeight * targetRatio);
    } else {
      w = screenWidth;
      h = Math.round(screenWidth * (aspectH / aspectW));
    }

    return { canvasWidth: w, canvasHeight: h };
  }, [screenWidth, screenHeight]);

  const share = async () => {
    if (!shotRef.current) return;
    setUiHidden(true);
    const uri = await captureRef(shotRef, {
      format: "png",
      quality: 1,
      width: Math.round(canvasWidth),
      height: Math.round(canvasHeight),
      result: "tmpfile",
    });
    setUiHidden(false);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  };

  const openMode = (m: ShareEditorMode) =>
    setPanelMode((prev) => (prev === m ? null : m));

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ViewShot
        ref={shotRef}
        style={[
          styles.shareCanvas,
          { width: canvasWidth, height: canvasHeight },
        ]}
      >
        <ShareCanvas
          width={canvasWidth}
          height={canvasHeight}
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
        </>
      )}

      <View style={styles.shareBtnWrap}>
        <PrimaryButton label="Share" onPress={share} />
      </View>

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
  root: {
    flex: 1,
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
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
  shareBtnWrap: {
    alignItems: "center",
    zIndex: 10,
    marginTop: 12,
  },
  shareCanvas: {
    alignSelf: "center",
  },
});
