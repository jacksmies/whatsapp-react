import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;
let db: NodePgDatabase<typeof schema> | undefined;

export function getDb() {
  if (db) {
    return db;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to store chat history.");
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  db = drizzle(pool, { schema });

  return db;
}
