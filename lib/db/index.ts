import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it's not supported in serverless environments
const client = postgres(connectionString, { max: 1 });

export const db = drizzle(client, { schema });

export type Database = typeof db;

