import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import Meal from "./models/Meal";
import User from "./models/User";
import ChatMessage from "./models/ChatMessage";
import { schema } from "./schema";
// import { migrations } from "./migrations"; // dodamy przy realnej migracji

const adapter = new SQLiteAdapter({
  schema,
  // migrations, // <— odkomentuj, gdy dodamy plik
  dbName: "caloriAi.db",
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [Meal, User, ChatMessage],
});

export default database;
