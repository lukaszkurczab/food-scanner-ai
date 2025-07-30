import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class ChatMessage extends Model {
  static table = "chatMessages";

  @field("userUid") userUid!: string;
  @field("role") role!: string;
  @field("content") content!: string;
  @field("createdAt") createdAt!: number;
  @field("lastSyncedAt") lastSyncedAt!: number;
  @field("syncState") syncState!: string;
  @field("cloudId") cloudId?: string;
  @field("deleted") deleted?: boolean;
}
