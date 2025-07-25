import { useState, useCallback, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import { mapRawToSurvey, Survey } from "@/src/utils/surveyMapper";
import {
  fetchSurveyFromFirestore,
  upsertSurveyInFirestore,
} from "@/src/services/firestore/firestoreSurveyService";
import type { FormData } from "@/src/types";

function toSurveySyncStatus(val: any): "synced" | "pending" | "conflict" {
  if (val === "synced" || val === "pending" || val === "conflict") return val;
  return "synced";
}

export function useSurvey(userUid: string) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);

  const getSurvey = useCallback(async () => {
    setLoading(true);
    const surveyCollection = database.get("surveys");
    const all = await surveyCollection.query().fetch();
    const userSurveys = all.filter((s: any) => s.user_uid === userUid);
    const latest = userSurveys.sort((a: any, b: any) =>
      b.completed_at.localeCompare(a.completed_at)
    )[0];
    setSurvey(latest ? mapRawToSurvey(latest._raw) : null);
    setLoading(false);
  }, [userUid]);

  const saveSurvey = useCallback(
    async (data: FormData) => {
      const surveyCollection = database.get("surveys");
      const completedAt = new Date().toISOString();
      await database.write(async () => {
        await surveyCollection.create((s: any) => {
          s.user_uid = userUid;
          s.form_data = JSON.stringify(data);
          s.completed_at = completedAt;
          s.sync_status = "pending";
        });
      });
      await getSurvey();
    },
    [userUid, getSurvey]
  );

  const syncSurveys = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;
    const surveyCollection = database.get("surveys");
    const all = await surveyCollection.query().fetch();
    const userSurveys = all.filter((s: any) => s.user_uid === userUid);

    const local = userSurveys.sort((a: any, b: any) =>
      b.completed_at.localeCompare(a.completed_at)
    )[0];
    const localSurvey = local ? mapRawToSurvey(local._raw) : null;

    const remote = await fetchSurveyFromFirestore(userUid);
    const remoteSurvey: Survey | null = remote
      ? {
          id: remote.id,
          userUid: remote.userUid,
          formData:
            typeof remote.formData === "string"
              ? JSON.parse(remote.formData)
              : remote.formData,
          completedAt: remote.completedAt,
          syncStatus: toSurveySyncStatus(remote.syncStatus),
        }
      : null;

    if (
      localSurvey &&
      (!remoteSurvey || localSurvey.completedAt > remoteSurvey.completedAt)
    ) {
      await upsertSurveyInFirestore(
        userUid,
        localSurvey.formData,
        localSurvey.completedAt
      );
      await database.write(async () => {
        await local.update((s: any) => {
          s.sync_status = "synced";
        });
      });
      setSurvey(localSurvey);
    } else if (
      remoteSurvey &&
      (!localSurvey || remoteSurvey.completedAt > localSurvey.completedAt)
    ) {
      await database.write(async () => {
        await surveyCollection.create((s: any) => {
          s.user_uid = userUid;
          s.form_data = JSON.stringify(remoteSurvey.formData);
          s.completed_at = remoteSurvey.completedAt;
          s.sync_status = "synced";
        });
      });
      setSurvey(remoteSurvey);
    } else if (
      localSurvey &&
      remoteSurvey &&
      localSurvey.completedAt === remoteSurvey.completedAt
    ) {
      setSurvey(localSurvey);
    }
  }, [userUid]);

  useEffect(() => {
    getSurvey();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncSurveys();
    });
    return unsubscribe;
  }, [getSurvey, syncSurveys]);

  return {
    survey,
    loading,
    getSurvey,
    saveSurvey,
    syncSurveys,
  };
}
