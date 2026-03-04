import type { ChatMessage, ChatThread } from "@/types";
import { emit } from "@/services/events";
import { getDB } from "./db";
import type { ChatMessageRow, ChatThreadRow } from "./types";

const MAX_LOCAL_CHAT_THREADS = 20;
const MAX_LOCAL_CHAT_MESSAGES_PER_THREAD = 50;

function rowToThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    userUid: row.user_uid,
    title: row.title || "",
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    lastMessage: row.last_message || undefined,
    lastMessageAt:
      row.last_message_at === null || row.last_message_at === undefined
        ? undefined
        : Number(row.last_message_at),
  };
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    userUid: row.user_uid,
    role:
      row.role === "user" || row.role === "assistant" || row.role === "system"
        ? row.role
        : "assistant",
    content: row.content,
    createdAt: Number(row.created_at || 0),
    lastSyncedAt: Number(row.last_synced_at || row.created_at || 0),
    syncState:
      row.sync_state === "pending" || row.sync_state === "conflict"
        ? row.sync_state
        : "synced",
    deleted: Number(row.deleted || 0) === 1,
    cloudId: row.id,
  };
}

function emitThreadEvents(userUid: string, threadId?: string) {
  emit(`chat:threads:${userUid}`);
  if (threadId) {
    emit(`chat:messages:${userUid}:${threadId}`);
  }
}

function pruneThreadMessages(userUid: string, threadId: string) {
  const db = getDB();
  db.runSync(
    `
      DELETE FROM chat_messages
      WHERE user_uid = ?
        AND thread_id = ?
        AND id NOT IN (
          SELECT id FROM chat_messages
          WHERE user_uid = ? AND thread_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        )
    `,
    [userUid, threadId, userUid, threadId, MAX_LOCAL_CHAT_MESSAGES_PER_THREAD],
  );
}

function pruneThreads(userUid: string) {
  const db = getDB();
  const stale = db.getAllSync<{ id: string }>(
    `
      SELECT id FROM chat_threads
      WHERE user_uid = ?
      ORDER BY updated_at DESC
      LIMIT -1 OFFSET ?
    `,
    [userUid, MAX_LOCAL_CHAT_THREADS],
  );

  for (const row of stale) {
    db.runSync(`DELETE FROM chat_messages WHERE user_uid = ? AND thread_id = ?`, [
      userUid,
      row.id,
    ]);
  }

  db.runSync(
    `
      DELETE FROM chat_threads
      WHERE user_uid = ?
        AND id NOT IN (
          SELECT id FROM chat_threads
          WHERE user_uid = ?
          ORDER BY updated_at DESC
          LIMIT ?
        )
    `,
    [userUid, userUid, MAX_LOCAL_CHAT_THREADS],
  );
}

export async function upsertChatThreadLocal(thread: ChatThread): Promise<void> {
  const db = getDB();
  db.runSync(
    `
      INSERT INTO chat_threads (
        id, user_uid, title, created_at, updated_at, last_message, last_message_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = COALESCE(NULLIF(excluded.title, ''), title),
        created_at = COALESCE(NULLIF(excluded.created_at, 0), created_at),
        updated_at = excluded.updated_at,
        last_message = excluded.last_message,
        last_message_at = excluded.last_message_at
    `,
    [
      thread.id,
      thread.userUid,
      thread.title || null,
      thread.createdAt,
      thread.updatedAt,
      thread.lastMessage || null,
      thread.lastMessageAt ?? null,
    ],
  );
  pruneThreads(thread.userUid);
  emitThreadEvents(thread.userUid, thread.id);
}

export async function upsertChatMessageLocal(params: {
  threadId: string;
  message: ChatMessage;
}): Promise<void> {
  const db = getDB();
  const { threadId, message } = params;
  db.runSync(
    `
      INSERT INTO chat_messages (
        id, thread_id, user_uid, role, content, created_at, last_synced_at, sync_state, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        content = excluded.content,
        created_at = excluded.created_at,
        last_synced_at = excluded.last_synced_at,
        sync_state = excluded.sync_state,
        deleted = excluded.deleted
    `,
    [
      message.id,
      threadId,
      message.userUid,
      message.role,
      message.content,
      message.createdAt,
      message.lastSyncedAt,
      message.syncState,
      message.deleted ? 1 : 0,
    ],
  );
  pruneThreadMessages(message.userUid, threadId);
  emitThreadEvents(message.userUid, threadId);
}

export async function setChatMessageSyncState(params: {
  userUid: string;
  threadId: string;
  messageId: string;
  syncState: ChatMessage["syncState"];
  lastSyncedAt?: number;
}): Promise<void> {
  const db = getDB();
  db.runSync(
    `
      UPDATE chat_messages
      SET sync_state = ?,
          last_synced_at = COALESCE(?, last_synced_at)
      WHERE user_uid = ? AND thread_id = ? AND id = ?
    `,
    [
      params.syncState,
      params.lastSyncedAt ?? null,
      params.userUid,
      params.threadId,
      params.messageId,
    ],
  );
  emitThreadEvents(params.userUid, params.threadId);
}

export async function getChatThreadsLocal(
  userUid: string,
  limitCount: number,
): Promise<ChatThread[]> {
  const db = getDB();
  const rows = db.getAllSync(
    `
      SELECT * FROM chat_threads
      WHERE user_uid = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [userUid, limitCount],
  ) as ChatThreadRow[];
  return rows.map(rowToThread);
}

export async function getChatMessagesPageLocal(params: {
  userUid: string;
  threadId: string;
  limitCount: number;
  beforeCreatedAt?: number | null;
}): Promise<{ items: ChatMessage[]; nextBeforeCreatedAt: number | null }> {
  const db = getDB();
  const rows = (
    params.beforeCreatedAt != null
      ? db.getAllSync(
          `
            SELECT * FROM chat_messages
            WHERE user_uid = ?
              AND thread_id = ?
              AND created_at < ?
            ORDER BY created_at DESC
            LIMIT ?
          `,
          [params.userUid, params.threadId, params.beforeCreatedAt, params.limitCount],
        )
      : db.getAllSync(
          `
            SELECT * FROM chat_messages
            WHERE user_uid = ?
              AND thread_id = ?
            ORDER BY created_at DESC
            LIMIT ?
          `,
          [params.userUid, params.threadId, params.limitCount],
        )
  ) as ChatMessageRow[];

  const items = rows.map(rowToMessage);
  return {
    items,
    nextBeforeCreatedAt:
      items.length === params.limitCount
        ? items[items.length - 1]?.createdAt ?? null
        : null,
  };
}
