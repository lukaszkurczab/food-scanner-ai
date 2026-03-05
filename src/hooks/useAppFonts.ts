import { useFonts } from "expo-font";
import { FONT_MAP } from "../utils/loadFonts.generated";

export const useAppFonts = () => {
  const [fontsLoaded, fontsError] = useFonts({
    "Inter-Regular": require("@/../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("@/../assets/fonts/Inter-Medium.ttf"),
    "Inter-Bold": require("@/../assets/fonts/Inter-Bold.ttf"),
    "Inter-Light": require("@/../assets/fonts/Inter-Light.ttf"),

    ...FONT_MAP,
  });

  if (fontsError) {
    console.error("[fonts] load error, fallback to system fonts", fontsError);
    return true;
  }

  return fontsLoaded;
};
