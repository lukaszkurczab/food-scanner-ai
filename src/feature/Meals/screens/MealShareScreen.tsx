import React, { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import ShareCanvas from "@/components/ShareCanvas";
import { ShareOptions, defaultShareOptions } from "@/types/share";
import { Layout, PrimaryButton, SecondaryButton, Card } from "@/components";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { RootStackParamList } from "@/navigation/navigate";
import type { Meal } from "@/types/meal";

type ScreenRoute = RouteProp<RootStackParamList, "MealShare">;

export default function MealShareScreen() {
  const theme = useTheme();
  const route = useRoute<ScreenRoute>();
  const nav = useNavigation<any>();
  const { meal, returnTo } = route.params;
  const [opts, setOpts] = useState<ShareOptions>({ ...defaultShareOptions });
  const shotRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(true);

  const nutrition = useMemo(
    () => calculateTotalNutrients([meal as Meal]),
    [meal]
  );

  const wait = (ms = 0) => new Promise((res) => setTimeout(res, ms));

  const share = async () => {
    if (!shotRef.current) return;
    // Hide editing UI from the captured image
    setMenuVisible(false);
    await wait(50);
    const uri = await captureRef(shotRef, {
      format: "png",
      quality: 1,
      width: 1080,
      height: 1920,
      result: "tmpfile",
    });
    setMenuVisible(true);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  return (
    <Layout showNavigation={false}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <View style={styles.center}>
          <ViewShot ref={shotRef}>
            <ShareCanvas
              width={360}
              height={640}
              photoUri={meal.photoUrl || null}
              title={meal.name || ""}
              kcal={nutrition.kcal}
              protein={nutrition.protein}
              fat={nutrition.fat}
              carbs={nutrition.carbs}
              options={opts}
              onChange={setOpts}
              menuVisible={menuVisible}
            />
          </ViewShot>
        </View>

        <PrimaryButton label="Udostępnij" onPress={share} />
        <SecondaryButton
          label="Wróć"
          onPress={() =>
            nav.navigate(
              returnTo as any,
              returnTo === "Result" ? undefined : { meal }
            )
          }
        />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
});
