import type { UserData } from "@/types";
import { get, post, upload } from "@/services/apiClient";
import { emit, on } from "@/services/events";
import { sanitizeUserProfilePatch } from "./profilePatch";

type AvatarUploadResponse = {
  avatarUrl: string;
  avatarlastSyncedAt: string;
};

const profileCache = new Map<string, UserData | null>();

function emitUserProfile(uid: string, data: UserData | null) {
  profileCache.set(uid, data);
  emit("user:profile:changed", { uid, data });
}

export function subscribeToUserProfile(params: {
  uid: string;
  onData: (data: UserData | null) => void;
}): () => void {
  const cached = profileCache.get(params.uid);
  if (cached !== undefined) {
    params.onData(cached);
  } else {
    void fetchUserProfileRemote(params.uid)
      .then((data) => {
        params.onData(data);
      })
      .catch(() => {
        params.onData(null);
      });
  }

  return on<{ uid?: string; data?: UserData | null }>(
    "user:profile:changed",
    (payload) => {
      if (payload?.uid !== params.uid) return;
      params.onData((payload.data as UserData | null | undefined) ?? null);
    },
  );
}

export async function fetchUserProfileRemote(uid: string): Promise<UserData | null> {
  void uid;
  const response = await get<{ profile: UserData | null }>("/users/me/profile");
  const profile = response.profile ?? null;
  emitUserProfile(uid, profile);
  return profile;
}

export async function mergeUserProfileRemote(
  uid: string,
  payload: Partial<UserData>,
): Promise<void> {
  void uid;
  const patch = sanitizeUserProfilePatch(payload);
  if (Object.keys(patch).length === 0) return;
  await post("/users/me/profile", patch);
  await fetchUserProfileRemote(uid);
}

export async function updateUserProfileRemote(
  uid: string,
  payload: Partial<UserData> & { updatedAt?: string },
): Promise<void> {
  await mergeUserProfileRemote(uid, payload);
}

export async function uploadUserAvatarRemote(
  uid: string,
  localPath: string,
): Promise<AvatarUploadResponse> {
  const data = new FormData();
  data.append("file", {
    uri: localPath,
    name: "avatar.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  const response = await upload<AvatarUploadResponse>("/users/me/avatar", data);
  const current = profileCache.get(uid);
  if (current) {
    emitUserProfile(uid, {
      ...current,
      avatarUrl: response.avatarUrl,
      avatarlastSyncedAt: response.avatarlastSyncedAt,
      avatarLocalPath: "",
    });
  }
  return response;
}
