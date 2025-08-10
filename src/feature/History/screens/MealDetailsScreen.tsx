import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  Layout,
  Card,
  PrimaryButton,
  IngredientBox,
  MealBox,
} from "@/src/components";
import { FallbackImage } from "../components/FallbackImage";
import { calculateTotalNutrients } from "@/src/services";
import type { Meal } from "@/src/types/meal";

export default function MealDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const meal: Meal | undefined = route.params?.meal;

  const [showIngredients, setShowIngredients] = useState(false);

  if (!meal) return null;

  const nutrition = useMemo(() => calculateTotalNutrients([meal]), [meal]);

  return (
    <Layout showNavigation={false}>
      <FallbackImage
        uri={meal.photoUrl || null}
        width={"100%"}
        height={220}
        borderRadius={theme.rounded.lg}
      />

      <View style={{ marginTop: theme.spacing.lg }}>
        <MealBox
          name={meal.name || ""}
          type={meal.type}
          nutrition={nutrition}
          editable={false}
        />
      </View>

      <Card
        variant="outlined"
        onPress={() => setShowIngredients((v) => !v)}
        style={{ marginTop: theme.spacing.md }}
      >
        <Text
          style={{
            fontSize: theme.typography.size.md,
            fontWeight: "500",
            color: theme.text,
            textAlign: "center",
          }}
        >
          {showIngredients
            ? t("hide_ingredients", { ns: "meals" })
            : t("show_ingredients", { ns: "meals" })}
        </Text>
      </Card>

      {showIngredients &&
        meal.ingredients.map((ingredient, idx) => (
          <IngredientBox
            key={`${ingredient.name}-${idx}`}
            ingredient={ingredient}
            editable={false}
          />
        ))}

      <View style={{ marginTop: theme.spacing.lg }}>
        <PrimaryButton
          label={t("edit_meal", { ns: "meals", defaultValue: "Edit meal" })}
          onPress={() => navigation.navigate("MealEdit", { meal })}
        />
      </View>
    </Layout>
  );
}
