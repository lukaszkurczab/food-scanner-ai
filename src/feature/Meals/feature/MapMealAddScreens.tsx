import MealCameraScreen from "../screens/MealAdd/MealCameraScreen";
import BarcodeProductNotFoundScreen from "../screens/MealAdd/BarcodeProductNotFoundScreen";
import IngredientsNotRecognizedScreen from "../screens/MealAdd/IngredientsNotRecognizedScreen";
import ReviewIngredientsScreen from "../screens/MealAdd/ReviewIngredientsScreen";
import ResultScreen from "../screens/MealAdd/ResultScreen";

export type MealAddScreenName =
  | "MealCamera"
  | "BarcodeProductNotFound"
  | "IngredientsNotRecognized"
  | "ReviewIngredients"
  | "Result";

export type MealAddStepParams = {
  MealCamera: {
    barcodeOnly?: boolean;
    id?: string;
    skipDetection?: boolean;
    returnTo?: MealAddScreenName;
    attempt?: number;
  };
  BarcodeProductNotFound: {
    code?: string;
    attempt?: number;
    returnTo?: MealAddScreenName;
  };
  IngredientsNotRecognized: {
    image?: string;
    id?: string;
    attempt?: number;
  };
  ReviewIngredients: {};
  Result: {};
};

export type MealAddFlowApi = {
  goTo: <N extends MealAddScreenName>(
    name: N,
    params?: MealAddStepParams[N],
  ) => void;
  replace: <N extends MealAddScreenName>(
    name: N,
    params?: MealAddStepParams[N],
  ) => void;
  goBack: () => void;
};

export type MealAddScreenProps<N extends MealAddScreenName> = {
  navigation: any;
  flow: MealAddFlowApi;
  params: MealAddStepParams[N];
};

const MapMealAddScreens = (screenName: MealAddScreenName) => {
  switch (screenName) {
    case "MealCamera":
      return MealCameraScreen;
    case "BarcodeProductNotFound":
      return BarcodeProductNotFoundScreen;
    case "IngredientsNotRecognized":
      return IngredientsNotRecognizedScreen;
    case "ReviewIngredients":
      return ReviewIngredientsScreen;
    case "Result":
      return ResultScreen;
    default:
      throw new Error(`Unknown screen: ${screenName}`);
  }
};

export default MapMealAddScreens;
