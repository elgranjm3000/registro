// Especialidades de consultas — uso: node scripts/seed-especialidades.mjs
// (usa DB_URL/DB_TOKEN si están definidos; si no, la BD local)
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DB_URL ?? "file:data/registros.db",
  authToken: process.env.DB_TOKEN,
});

const LISTA = [
  "CARDIOLOGÍA", "TRAUMATOLOGÍA", "CIRUGÍA PLÁSTICA", "ENDOCRINOLOGÍA",
  "MEDICINA INTERNA", "PEDIATRÍA", "GINECOLOGÍA Y OBSTETRICIA", "CIRUGÍA GENERAL",
  "OFTALMOLOGÍA", "OTORRINOLARINGOLOGÍA", "DERMATOLOGÍA", "UROLOGÍA",
  "NEUROLOGÍA", "PSIQUIATRÍA", "ODONTOLOGÍA", "MEDICINA FAMILIAR",
  "NEUMONOLOGÍA", "GASTROENTEROLOGÍA", "NEFROLOGÍA", "REHABILITACIÓN",
  "NUTRICIÓN", "ONCOLOGÍA", "REUMATOLOGÍA", "INFECTOLOGÍA",
  // Agrega aquí las demás especialidades (o desde el panel del admin)
];

let i = 0;
for (const nombre of LISTA) {
  await db.execute({
    sql: "INSERT INTO especialidades (nombre, orden) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM especialidades WHERE nombre = ?)",
    args: [nombre, ++i, nombre],
  });
}
const { rows } = await db.execute("SELECT COUNT(*) n FROM especialidades");
console.log(`Especialidades: ${rows[0].n}`);
