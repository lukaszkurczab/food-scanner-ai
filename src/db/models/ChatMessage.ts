import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class ChatMessage extends Model {
  static table = "chat_messages";

  @field("user_uid") userUid!: string;
  @field("role") role!: string;
  @field("content") content!: string;
  @field("created_at") createdAt!: string;
  @field("updated_at") updatedAt!: string;
  @field("sync_status") syncState!: string;
  @field("cloud_id") cloudId?: string;
  @field("deleted") deleted?: boolean;
}
