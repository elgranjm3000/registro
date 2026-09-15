import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Hoy: SQLite local con libsql. Mañana: apuntar DB_URL a Turso/Supabase
// (drizzle + libsql funcionan igual sobre la nube; solo cambia la URL).
const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });
const url = process.env.DB_URL ?? `file:${path.join(dataDir, "registros.db")}`;

const client = createClient({ url, authToken: process.env.DB_TOKEN });

export const db = drizzle(client, { schema });
