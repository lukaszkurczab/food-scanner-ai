import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class Settings extends Model {
  static table = "settings";

  @field("userUid") userUid!: string;
  @field("key") key!: string;
  @field("value") value!: string;
  @field("lastUpdated") lastUpdated!: string;
}
