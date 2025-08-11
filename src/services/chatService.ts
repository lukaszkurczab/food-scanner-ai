import NetInfo from "@react-native-community/netinfo";
import { database } from "@/db/database";
import { Q } from "@nozbe/watermelondb";
import ChatMessageModel from "@/db/models/ChatMessage";
import type { ChatMessage, ChatSyncState } from "@/types";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
} from "@react-native-firebase/firestore";

function db() {
  return getFirestore(getApp());
}

function col(userUid: string) {
  return collection(db(), "users", userUid, "chat_messages");
}

export type ChatPage = { items: ChatMessage[]; nextCursor: any | null };

export async function listLocal(userUid: string): Promise<ChatMessage[]> {
  const c = database.get<ChatMessageModel>("chatMessages");
  const rows = await c
    .query(
      Q.where("userUid", userUid),
      Q.where("deleted", false),
      Q.sortBy("createdAt", Q.desc)
    )
    .fetch();
  return rows.map((m) => ({
    id: m.id,
    userUid: m.userUid,
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
    createdAt: m.createdAt,
    lastSyncedAt: m.lastSyncedAt,
    syncState: m.syncState as ChatSyncState,
    cloudId: m.cloudId,
    deleted: !!m.deleted,
  }));
}

export async function createLocal(msg: Omit<ChatMessage, "id">): Promise<void> {
  const c = database.get<ChatMessageModel>("chatMessages");
  await database.write(async () => {
    await c.create((m: any) => {
      m.userUid = msg.userUid;
      m.role = msg.role;
      m.content = msg.content;
      m.createdAt = msg.createdAt;
      m.lastSyncedAt = msg.lastSyncedAt ?? 0;
      m.syncState = msg.syncState ?? "pending";
      m.cloudId = msg.cloudId ?? null;
      m.deleted = !!msg.deleted;
    });
  });
}

export async function markLocalSyncedById(
  localId: string,
  cloudId: string,
  ts: number
): Promise<void> {
  const c = database.get<ChatMessageModel>("chatMessages");
  const row = await c.find(localId);
  await database.write(async () => {
    await row.update((m: any) => {
      m.syncState = "synced";
      m.cloudId = cloudId;
      m.lastSyncedAt = ts;
    });
  });
}

export async function pullPage(
  userUid: string,
  pageSize = 50,
  cursor?: any | null
): Promise<ChatPage> {
  const base = query(
    col(userUid),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const q = cursor ? query(base, startAfter(cursor)) : base;
  try {
    const snap = await getDocs(q);
    const items = snap.docs.map((d: any) => {
      const data = d.data() as ChatMessage;
      return { ...data, id: d.id };
    });
    const nextCursor =
      snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;

    const c = database.get<ChatMessageModel>("chatMessages");
    await database.write(async () => {
      for (const msg of items) {
        const existing = await c.query(Q.where("cloudId", msg.id)).fetch();
        if (existing[0]) {
          await existing[0].update((m: any) => {
            m.userUid = msg.userUid;
            m.role = msg.role;
            m.content = msg.content;
            m.createdAt =
              typeof msg.createdAt === "number" ? msg.createdAt : Date.now();
            m.lastSyncedAt =
              typeof msg.lastSyncedAt === "number"
                ? msg.lastSyncedAt
                : Date.now();
            m.syncState = "synced";
            m.cloudId = msg.id;
            m.deleted = !!msg.deleted;
          });
        } else {
          await c.create((m: any) => {
            m.userUid = msg.userUid;
            m.role = msg.role;
            m.content = msg.content;
            m.createdAt =
              typeof msg.createdAt === "number" ? msg.createdAt : Date.now();
            m.lastSyncedAt =
              typeof msg.lastSyncedAt === "number" ? msg.lastSyncedAt : 0;
            m.syncState = "synced";
            m.cloudId = msg.id;
            m.deleted = !!msg.deleted;
          });
        }
      }
    });

    return { items, nextCursor };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function pushPending(userUid: string): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const c = database.get<ChatMessageModel>("chatMessages");
  const pending = await c
    .query(Q.where("syncState", "pending"), Q.where("userUid", userUid))
    .fetch();

  for (const row of pending) {
    const data: ChatMessage = {
      id: row.id,
      userUid: row.userUid,
      role: row.role as any,
      content: row.content,
      createdAt: row.createdAt,
      lastSyncedAt: row.lastSyncedAt,
      syncState: row.syncState as any,
      cloudId: row.cloudId,
      deleted: !!row.deleted,
    };

    let cloudId: string; // <<< kluczowe zawężenie

    if (!data.cloudId) {
      const ref = await addDoc(col(userUid), {
        userUid: data.userUid,
        role: data.role,
        content: data.content,
        createdAt:
          typeof data.createdAt === "number" ? data.createdAt : Date.now(),
        lastSyncedAt: Date.now(),
        syncState: "pending",
        deleted: !!data.deleted,
      });
      cloudId = ref.id; // teraz na pewno string
    } else {
      cloudId = data.cloudId; // zawężone do string
      await setDoc(
        doc(col(userUid), cloudId),
        {
          userUid: data.userUid,
          role: data.role,
          content: data.content,
          createdAt:
            typeof data.createdAt === "number" ? data.createdAt : Date.now(),
          lastSyncedAt: Date.now(),
          syncState: "pending",
          deleted: !!data.deleted,
        },
        { merge: true }
      );
    }

    await updateDoc(doc(col(userUid), cloudId), {
      syncState: "synced",
      lastSyncedAt: Date.now(),
    });

    await markLocalSyncedById(row.id, cloudId, Date.now());
  }
}

export async function softDeleteLocal(
  userUid: string,
  cloudIdOrLocalId: string
): Promise<void> {
  const c = database.get<ChatMessageModel>("chatMessages");
  try {
    const row = await c.find(cloudIdOrLocalId);
    await database.write(async () => {
      await row.update((m: any) => {
        m.deleted = true;
        m.syncState = "pending";
        m.lastSyncedAt = Date.now();
      });
    });
  } catch {
    const rows = await c
      .query(Q.where("cloudId", cloudIdOrLocalId), Q.where("userUid", userUid))
      .fetch();
    if (rows[0]) {
      await database.write(async () => {
        await rows[0].update((m: any) => {
          m.deleted = true;
          m.syncState = "pending";
          m.lastSyncedAt = Date.now();
        });
      });
    }
  }
}

export async function pushDeletes(userUid: string): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;
  const c = database.get<ChatMessageModel>("chatMessages");
  const rows = await c
    .query(
      Q.where("userUid", userUid),
      Q.where("deleted", true),
      Q.where("syncState", "pending")
    )
    .fetch();
  for (const row of rows) {
    if (row.cloudId) {
      await updateDoc(doc(col(userUid), row.cloudId), {
        deleted: true,
        syncState: "synced",
        lastSyncedAt: Date.now(),
      });
    }
    await database.write(async () => {
      await row.update((m: any) => {
        m.syncState = "synced";
      });
    });
  }
}

// --- HELPER: dodaj wiadomość (tworzy document, zwraca id) ---
export async function addChatMessageToFirestore(
  message: ChatMessage
): Promise<string> {
  const ref = await addDoc(col(message.userUid), {
    userUid: message.userUid,
    role: message.role,
    content: message.content,
    createdAt:
      typeof message.createdAt === "number" ? message.createdAt : Date.now(),
    lastSyncedAt:
      typeof message.lastSyncedAt === "number"
        ? message.lastSyncedAt
        : Date.now(),
    syncState: message.syncState ?? "pending",
    deleted: !!message.deleted,
  });
  return ref.id;
}

// --- HELPER: upsert po cloudId (merge) ---
export async function upsertChatMessageInFirestore(
  cloudId: string,
  message: ChatMessage
): Promise<void> {
  await setDoc(
    doc(col(message.userUid), cloudId),
    {
      userUid: message.userUid,
      role: message.role,
      content: message.content,
      createdAt:
        typeof message.createdAt === "number" ? message.createdAt : Date.now(),
      lastSyncedAt:
        typeof message.lastSyncedAt === "number"
          ? message.lastSyncedAt
          : Date.now(),
      syncState: message.syncState ?? "pending",
      deleted: !!message.deleted,
    },
    { merge: true }
  );
}
