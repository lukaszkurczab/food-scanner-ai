import React, { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import ShareCanvas from "@/components/ShareCanvas";
import { ShareOptions, defaultShareOptions } from "@/types/share";
import {
  Layout,
  PrimaryButton,
  SecondaryButton,
  Checkbox,
  Card,
} from "@/components";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { RootStackParamList } from "@/navigation/navigate";
import type { Meal } from "@/types/meal";

type ScreenRoute = RouteProp<RootStackParamList, "MealShare">;

export default function MealShareScreen() {
  const route = useRoute<ScreenRoute>();
  const nav = useNavigation<any>();
  const { meal, returnTo } = route.params;
  const [opts, setOpts] = useState<ShareOptions>({ ...defaultShareOptions });
  const shotRef = useRef<View>(null);

  const nutrition = useMemo(
    () => calculateTotalNutrients([meal as Meal]),
    [meal]
  );

  const share = async () => {
    if (!shotRef.current) return;
    const uri = await captureRef(shotRef, {
      format: "png",
      quality: 1,
      width: 1080,
      height: 1920,
      result: "tmpfile",
    });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    nav.navigate(returnTo as any, returnTo === "Result" ? undefined : { meal });
  };

  return (
    <Layout showNavigation={false}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: "center" }}>
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
            />
          </ViewShot>
        </View>

        <Card>
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>Elementy</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Checkbox
              checked={opts.showTitle}
              onChange={(v: boolean) => setOpts({ ...opts, showTitle: v })}
            />
            <Text>Tytuł</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Checkbox
              checked={opts.showKcal}
              onChange={(v: boolean) => setOpts({ ...opts, showKcal: v })}
            />
            <Text>Kalorie</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Checkbox
              checked={opts.showPie}
              onChange={(v: boolean) => setOpts({ ...opts, showPie: v })}
            />
            <Text>Wykres</Text>
          </View>
          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            Przesuwaj elementy jednym palcem. Zmieniaj rozmiar szczypaniem.
          </Text>
        </Card>

        <Card>
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>Filtr</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SecondaryButton
              label="Brak"
              onPress={() => setOpts({ ...opts, filter: "none" })}
            />
            <SecondaryButton
              label="B/W"
              onPress={() => setOpts({ ...opts, filter: "bw" })}
            />
            <SecondaryButton
              label="Sepia"
              onPress={() => setOpts({ ...opts, filter: "sepia" })}
            />
          </View>
        </Card>

        <PrimaryButton label="Udostępnij" onPress={share} />
        <SecondaryButton
          label="Wróć bez udostępniania"
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
