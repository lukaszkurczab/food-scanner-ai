import { useState, useCallback } from "react";
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

function areSurveysEqual(a: Survey | null, b: Survey | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.completedAt === b.completedAt &&
    JSON.stringify(a.formData) === JSON.stringify(b.formData)
  );
}

export function useSurvey(userUid: string) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(false);

  const getSurvey = useCallback(async () => {
    setLoading(true);
    const surveyCollection = database.get("surveys");
    const all = await surveyCollection.query().fetch();
    const userSurveys = all.filter((s: any) => s.user_uid === userUid);
    const latest = userSurveys.sort((a: any, b: any) =>
      b.completed_at.localeCompare(a.completed_at)
    )[0];
    const result = latest ? mapRawToSurvey(latest._raw) : null;
    setSurvey((prev) => (areSurveysEqual(prev, result) ? prev : result));
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

  const syncSurveys = useCallback(
    async (remoteData?: Survey | null) => {
      const surveyCollection = database.get("surveys");
      const all = await surveyCollection.query().fetch();
      const userSurveys = all.filter((s: any) => s.user_uid === userUid);

      const local = userSurveys.sort((a: any, b: any) =>
        b.completed_at.localeCompare(a.completed_at)
      )[0];
      const localSurvey = local ? mapRawToSurvey(local._raw) : null;

      let remoteSurvey = remoteData;
      if (typeof remoteSurvey === "undefined") {
        const remote = await fetchSurveyFromFirestore(userUid);
        remoteSurvey = remote
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
      }

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
        setSurvey((prev) =>
          areSurveysEqual(prev, localSurvey) ? prev : localSurvey
        );
      } else if (
        remoteSurvey &&
        (!localSurvey || remoteSurvey.completedAt > localSurvey.completedAt)
      ) {
        await database.write(async () => {
          await surveyCollection.create((s: any) => {
            s.user_uid = userUid;
            s.form_data = JSON.stringify(remoteSurvey!.formData);
            s.completed_at = remoteSurvey!.completedAt;
            s.sync_status = "synced";
          });
        });
        setSurvey((prev) =>
          areSurveysEqual(prev, remoteSurvey) ? prev : remoteSurvey
        );
      } else if (
        localSurvey &&
        remoteSurvey &&
        localSurvey.completedAt === remoteSurvey.completedAt
      ) {
        setSurvey((prev) =>
          areSurveysEqual(prev, localSurvey) ? prev : localSurvey
        );
      }
    },
    [userUid]
  );

  return {
    survey,
    loading,
    getSurvey,
    saveSurvey,
    syncSurveys,
  };
}
