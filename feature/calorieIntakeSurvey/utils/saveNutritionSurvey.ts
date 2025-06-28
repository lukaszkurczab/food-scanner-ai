import firestore from "@react-native-firebase/firestore";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { NutritionSurvey } from "../types/types";

const db = firestore();

export const saveNutritionSurvey = async (
  user: FirebaseAuthTypes.User,
  surveyData: NutritionSurvey
) => {
  const userRef = db.collection("users").doc(user.uid);
  await userRef.update({
    nutritionSurvey: surveyData,
    firstLogin: false,
  });
};
