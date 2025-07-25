import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class Survey extends Model {
  static table = "surveys";

  @field("user_uid") userUid!: string;
  @field("form_data") formData!: string;
  @field("completed_at") completedAt!: string;
  @field("sync_status") syncState!: string;
}
