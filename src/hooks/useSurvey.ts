import { useState, useCallback } from "react";
import { database } from "@/src/db/database";
import type { FormData } from "@/src/types";
import {
  upsertSurveyInFirestore,
  fetchSurveyFromFirestore,
} from "@/src/services/firestore/firestoreSurveyService";

export function useSurvey(userUid: string) {
  const [survey, setSurvey] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);

  const getSurvey = useCallback(async () => {
    setLoading(true);
    const userCollection = database.get("users");
    const users = await userCollection.query().fetch();
    const localUser = users.find((u: any) => u.uid === userUid);

    if (localUser) {
      const s: any = localUser._raw;
      setSurvey({
        unitsSystem: s.units_system,
        age: s.age,
        sex: s.sex,
        height: s.height,
        heightInch: s.height_inch,
        weight: s.weight,
        preferences: s.preferences,
        activityLevel: s.activity_level,
        goal: s.goal,
        calorieDeficit: s.calorie_deficit,
        calorieSurplus: s.calorie_surplus,
        chronicDiseases: s.chronic_diseases,
        chronicDiseasesOther: s.chronic_diseases_other,
        allergies: s.allergies,
        allergiesOther: s.allergies_other,
        lifestyle: s.lifestyle,
        aiStyle: s.ai_style,
        aiFocus: s.ai_focus,
        aiFocusOther: s.ai_focus_other,
        aiNote: s.ai_note,
      });
    } else {
      setSurvey(null);
    }
    setLoading(false);
  }, [userUid]);

  const saveSurvey = useCallback(
    async (data: FormData) => {
      const userCollection = database.get("users");
      const users = await userCollection.query().fetch();
      const localUser = users.find((u: any) => u.uid === userUid);

      if (localUser) {
        await database.write(async () => {
          await localUser.update((u: any) => {
            Object.assign(u, data, {
              syncStatus: "pending",
              updatedAt: new Date().toISOString(),
            });
          });
        });
        setSurvey(data);
      }
      await upsertSurveyInFirestore(userUid, data);
    },
    [userUid]
  );

  const syncSurvey = useCallback(async () => {
    const remoteSurvey = await fetchSurveyFromFirestore(userUid);
    if (remoteSurvey) setSurvey(remoteSurvey);
  }, [userUid]);

  return {
    survey,
    loading,
    getSurvey,
    saveSurvey,
    syncSurvey,
  };
}
