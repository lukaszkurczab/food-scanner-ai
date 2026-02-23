import { useEffect, useState } from "react";
import { useNetInfo } from "@react-native-community/netinfo";
import { on } from "@/services/events";

export type SyncStatus = "idle" | "queued" | "syncing" | "offline";

type SyncStatusEvent = {
  uid?: string;
  status?: SyncStatus;
};

export function useSyncStatus(uid?: string | null): SyncStatus {
  const netInfo = useNetInfo();
  const [status, setStatus] = useState<SyncStatus>("idle");

  useEffect(() => {
    if (!uid) {
      setStatus("idle");
      return;
    }
    const unsub = on<SyncStatusEvent>("sync:status", (payload) => {
      if (!payload || payload.uid !== uid || !payload.status) return;
      setStatus(payload.status);
    });
    return () => {
      unsub();
    };
  }, [uid]);

  useEffect(() => {
    if (netInfo.isConnected === false && status !== "syncing") {
      setStatus("offline");
      return;
    }
    if (netInfo.isConnected && status === "offline") {
      setStatus("idle");
    }
  }, [netInfo.isConnected, status]);

  return status;
}
