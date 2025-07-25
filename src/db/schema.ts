import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "users",
      columns: [
        { name: "uid", type: "string" },
        { name: "email", type: "string" },
        { name: "username", type: "string", isOptional: true },
        { name: "created_at", type: "string" },
        { name: "last_login", type: "string" },
        { name: "plan", type: "string" },

        { name: "units_system", type: "string" },
        { name: "age", type: "string" },
        { name: "sex", type: "string" },
        { name: "height", type: "string" },
        { name: "height_inch", type: "string", isOptional: true },
        { name: "weight", type: "string" },
        { name: "preferences", type: "string" },
        { name: "activity_level", type: "string" },
        { name: "goal", type: "string" },
        { name: "calorie_deficit", type: "number", isOptional: true },
        { name: "calorie_surplus", type: "number", isOptional: true },
        { name: "chronic_diseases", type: "string", isOptional: true },
        { name: "chronic_diseases_other", type: "string", isOptional: true },
        { name: "allergies", type: "string", isOptional: true },
        { name: "allergies_other", type: "string", isOptional: true },
        { name: "lifestyle", type: "string", isOptional: true },
        { name: "ai_style", type: "string", isOptional: true },
        { name: "ai_focus", type: "string", isOptional: true },
        { name: "ai_focus_other", type: "string", isOptional: true },
        { name: "ai_note", type: "string", isOptional: true },

        { name: "sync_status", type: "string" },
        { name: "last_synced_at", type: "string", isOptional: true },
      ],
    }),

    tableSchema({
      name: "meals",
      columns: [
        { name: "user_uid", type: "string" },
        { name: "name", type: "string" },
        { name: "date", type: "string" },
        { name: "photo_uri", type: "string", isOptional: true },
        { name: "kcal", type: "number" },
        { name: "carbs", type: "number" },
        { name: "fat", type: "number" },
        { name: "protein", type: "number" },
        { name: "ingredients", type: "string" },
        { name: "meal_type", type: "string", isOptional: true },
        { name: "source", type: "string" },
        { name: "sync_status", type: "string" },
        { name: "last_updated", type: "string" },
        { name: "deleted", type: "boolean", isOptional: true },
      ],
    }),

    tableSchema({
      name: "surveys",
      columns: [
        { name: "user_uid", type: "string" },
        { name: "form_data", type: "string" },
        { name: "completed_at", type: "string" },
        { name: "sync_status", type: "string" },
      ],
    }),

    tableSchema({
      name: "settings",
      columns: [
        { name: "user_uid", type: "string" },
        { name: "key", type: "string" },
        { name: "value", type: "string" },
        { name: "last_updated", type: "string" },
      ],
    }),

    tableSchema({
      name: "chat_messages",
      columns: [
        { name: "user_uid", type: "string" },
        { name: "role", type: "string" },
        { name: "content", type: "string" },
        { name: "created_at", type: "string" },
        { name: "updated_at", type: "string" },
        { name: "sync_status", type: "string" },
        { name: "cloud_id", type: "string", isOptional: true },
        { name: "deleted", type: "boolean", isOptional: true },
      ],
    }),
  ],
});
