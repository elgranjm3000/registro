import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Hoy: SQLite local con libsql. En producción: DB_URL apunta a Turso
// (drizzle + libsql funcionan igual sobre la nube; solo cambia la URL).
const url =
  process.env.DB_URL ??
  (() => {
    // Solo en local: crea la carpeta de la BD (Vercel tiene FS de solo lectura)
    mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
    return `file:${path.join(process.cwd(), "data", "registros.db")}`;
  })();

const client = createClient({ url, authToken: process.env.DB_TOKEN });

export const db = drizzle(client, { schema });
