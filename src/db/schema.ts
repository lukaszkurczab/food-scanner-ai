import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: "users",
      columns: [
        { name: "uid", type: "string" },
        { name: "email", type: "string" },
        { name: "username", type: "string", isOptional: true },
        { name: "createdAt", type: "number" },
        { name: "lastLogin", type: "string" },
        { name: "plan", type: "string" },
        { name: "darkTheme", type: "boolean", isOptional: true },
        { name: "avatarUrl", type: "string", isOptional: true },
        { name: "avatarLocalPath", type: "string", isOptional: true },
        { name: "avatarlastSyncedAt", type: "string", isOptional: true },
        { name: "unitsSystem", type: "string" },
        { name: "age", type: "string" },
        { name: "sex", type: "string" },
        { name: "height", type: "string" },
        { name: "heightInch", type: "string", isOptional: true },
        { name: "weight", type: "string" },
        { name: "preferences", type: "string" },
        { name: "activityLevel", type: "string" },
        { name: "goal", type: "string" },
        { name: "calorieDeficit", type: "number", isOptional: true },
        { name: "calorieSurplus", type: "number", isOptional: true },
        { name: "chronicDiseases", type: "string", isOptional: true },
        { name: "chronicDiseasesOther", type: "string", isOptional: true },
        { name: "allergies", type: "string", isOptional: true },
        { name: "allergiesOther", type: "string", isOptional: true },
        { name: "lifestyle", type: "string", isOptional: true },
        { name: "aiStyle", type: "string", isOptional: true },
        { name: "aiFocus", type: "string", isOptional: true },
        { name: "aiFocusOther", type: "string", isOptional: true },
        { name: "aiNote", type: "string", isOptional: true },
        { name: "surveyComplited", type: "boolean" },
        { name: "language", type: "string" },
        { name: "syncState", type: "string" },
        { name: "lastSyncedAt", type: "string", isOptional: true },
        { name: "calorieTarget", type: "number", isOptional: true },
      ],
    }),

    tableSchema({
      name: "meals",
      columns: [
        { name: "userUid", type: "string" },
        { name: "mealId", type: "string" },
        { name: "timestamp", type: "string" },
        { name: "type", type: "string" },
        { name: "name", type: "string", isOptional: true },
        { name: "ingredients", type: "string" }, // JSON.stringify
        { name: "createdAt", type: "string" },
        { name: "updatedAt", type: "string" },
        { name: "syncState", type: "string" },
        { name: "source", type: "string" },
        { name: "photoUrl", type: "string", isOptional: true },
        { name: "notes", type: "string", isOptional: true },
        { name: "tags", type: "string", isOptional: true }, // JSON.stringify
        { name: "deleted", type: "boolean", isOptional: true },
        { name: "cloudId", type: "string", isOptional: true },
      ],
    }),

    tableSchema({
      name: "settings",
      columns: [
        { name: "userUid", type: "string" },
        { name: "key", type: "string" },
        { name: "value", type: "string" },
        { name: "lastUpdated", type: "string" },
      ],
    }),

    tableSchema({
      name: "chatMessages",
      columns: [
        { name: "userUid", type: "string" },
        { name: "role", type: "string" },
        { name: "content", type: "string" },
        { name: "createdAt", type: "number" },
        { name: "lastSyncedAt", type: "number" },
        { name: "syncState", type: "string" },
        { name: "cloudId", type: "string", isOptional: true },
        { name: "deleted", type: "boolean", isOptional: true },
      ],
    }),
  ],
});
