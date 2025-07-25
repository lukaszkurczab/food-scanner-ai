import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

import Meal from "./models/Meal";
import User from "./models/User";
import Survey from "./models/Survey";
import Settings from "./models/Settings";
import ChatMessage from "./models/ChatMessage";

import { schema } from "./schema";

const adapter = new SQLiteAdapter({
  schema,
  dbName: "caloriAi.db",
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [Meal, User, Survey, Settings, ChatMessage],
});

export default database;
