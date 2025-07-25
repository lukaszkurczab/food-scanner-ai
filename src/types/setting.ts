type SettingStatus = "synced" | "pending" | "conflict";

export interface Setting {
  userUid: string;
  key: string;
  value: string;
  lastUpdated: string;
  syncStatus: SettingStatus;
}
