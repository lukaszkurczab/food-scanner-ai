import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import MapMealAddScreens, {
  type MealAddFlowApi,
  type MealAddScreenName,
  type MealAddStepParams,
} from "../feature/MapMealAddScreens";

type Step<N extends MealAddScreenName = MealAddScreenName> = {
  name: N;
  params: MealAddStepParams[N];
};

export default function AddMealScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialStep: Step = useMemo(() => {
    const p = (route.params || {}) as Partial<
      MealAddStepParams["MealCamera"]
    > & {
      start?: MealAddScreenName;
      code?: string;
      image?: string;
    };

    const start = (p.start as MealAddScreenName | undefined) || "MealCamera";

    if (start === "MealCamera") {
      return {
        name: "MealCamera",
        params: {
          barcodeOnly: !!p.barcodeOnly,
          id: p.id,
          skipDetection: !!p.skipDetection,
          returnTo: (p.returnTo as MealAddScreenName | undefined) || "Result",
          attempt: typeof p.attempt === "number" ? p.attempt : 1,
        },
      };
    }

    if (start === "BarcodeProductNotFound") {
      return {
        name: "BarcodeProductNotFound",
        params: {
          code: p.code,
          attempt: typeof p.attempt === "number" ? p.attempt : 1,
          returnTo: (p.returnTo as MealAddScreenName | undefined) || "Result",
        },
      };
    }

    if (start === "IngredientsNotRecognized") {
      return {
        name: "IngredientsNotRecognized",
        params: {
          image: p.image,
          id: p.id,
          attempt: typeof p.attempt === "number" ? p.attempt : 1,
        },
      };
    }

    if (start === "ReviewIngredients") {
      return { name: "ReviewIngredients", params: {} };
    }

    return { name: "Result", params: {} };
  }, [route.params]);

  const [stack, setStack] = useState<Step[]>([initialStep]);

  useEffect(() => {
    setStack([initialStep]);
  }, [initialStep]);

  const goTo = useCallback<MealAddFlowApi["goTo"]>((name, params) => {
    setStack((prev) => [
      ...prev,
      { name, params: (params ?? ({} as any)) as any },
    ]);
  }, []);

  const replace = useCallback<MealAddFlowApi["replace"]>((name, params) => {
    setStack((prev) => {
      const next = [...prev];
      next[next.length - 1] = { name, params: (params ?? ({} as any)) as any };
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const flow: MealAddFlowApi = useMemo(
    () => ({
      goTo,
      goBack,
      replace,
    }),
    [goTo, goBack, replace],
  );

  useEffect(() => {
    const onBackPress = () => {
      if (stack.length > 1) {
        goBack();
        return true;
      }
      navigation.goBack();
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [goBack, navigation, stack.length]);

  const current = stack[stack.length - 1];
  const Screen = MapMealAddScreens(current.name);

  return <Screen navigation={navigation} flow={flow} params={current.params} />;
}
