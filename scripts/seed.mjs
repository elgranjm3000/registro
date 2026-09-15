// Seed inicial: centros de la Red de Salud Militar + usuario admin.
// Uso: node scripts/seed.mjs   (tras `npx drizzle-kit push`)
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const db = createClient({ url: process.env.DB_URL ?? "file:data/registros.db" });

const centros = [
  ["HOSPITAL MILITAR TIPO IV UNIVERSITARIO \"DR. CARLOS ARVELO\"", "hospital", "CARACAS, D.C."],
  ["HOSPITAL MILITAR TIPO I \"DR. VICENTE SALIAS\"", "hospital", "CARACAS, D.C."],
  ["HOSPITAL MILITAR \"CNEL. ELBANO PAREDES VIVAS\"", "hospital", "MARACAY, EDO. ARAGUA"],
  ["HOSPITAL MILITAR TIPO II \"CAP. GUILLERMO HERNÁNDEZ JACOBSEN\"", "hospital", "SAN CRISTÓBAL, EDO. TÁCHIRA"],
  ["HOSPITAL MILITAR TIPO III \"DR. JOSÉ ÁNGEL ÁLAMO\"", "hospital", "BARQUISIMETO, EDO. LARA"],
  ["HOSPITAL MILITAR TIPO I \"DR. JOSÉ MARÍA VARGAS\"", "hospital", "SAN JUAN DE LOS MORROS, EDO. GUÁRICO"],
  ["HOSPITAL MILITAR TIPO I \"CNEL. NELSON SAYAGO MORA\"", "hospital", "LA ASUNCIÓN, EDO. NUEVA ESPARTA"],
  ["HOSPITAL NAVAL TIPO I \"DR. PEDRO MANUEL CHIRINOS\"", "hospital", "PUNTO FIJO, EDO. FALCÓN"],
  ["HOSPITAL MILITAR TIPO I \"DR. MANUEL SIVERIO CASTILLO\"", "hospital", "PUERTO ORDAZ, EDO. BOLÍVAR"],
  ["HOSPITAL MILITAR TIPO I \"TCNEL. DR. FRANCISCO VALBUENA\"", "hospital", "MARACAIBO, EDO. ZULIA"],
  ["HOSPITAL NAVAL TIPO I \"DR. RAÚL PERDOMO HURTADO\"", "hospital", "CATIA LA MAR, EDO. LA GUAIRA"],
  ["HOSPITAL NAVAL TIPO I \"DR. FRANCISCO ISNARDI\"", "hospital", "PUERTO CABELLO, EDO. CARABOBO"],
  ["AMBULATORIO MILITAR \"AMAZONAS\"", "ambulatorio", "PUERTO AYACUCHO, EDO. AMAZONAS"],
  ["AMBULATORIO MILITAR \"CONCEPCIÓN MARINO\"", "ambulatorio", "CARÚPANO, EDO. SUCRE"],
  ["N.M.A. \"MY. LEONARDO GÓMEZ CALDERÓN\"", "otro", "MÉRIDA, EDO. MÉRIDA"],
  ["N.M.A. \"GUASDUALITO\"", "otro", "GUASDUALITO, EDO. APURE"],
  ["CASA HOGAR DEL ADULTO MAYOR \"AÑOS DORADOS CARABOBO\"", "otro", "EDO. CARABOBO"],
  // Agrega aquí los centros restantes hasta completar los 32
];

for (const [nombre, tipo, ubicacion] of centros) {
  await db.execute({
    sql: "INSERT INTO hospitales (nombre, tipo, ubicacion, creado_en) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
    args: [nombre, tipo, ubicacion, new Date().toISOString()],
  });
}

const claveHash = bcrypt.hashSync(process.env.ADMIN_CLAVE ?? "digesalud2026", 10);
await db.execute({
  sql: "INSERT INTO usuarios (email, clave_hash, nombre, rol) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING",
  args: ["admin@digesalud.mil.ve", claveHash, "Jefe Sala Situacional", "admin"],
});

// Usuario demo por centro (clave: centro2026) — quitar en producción
const claveCentro = bcrypt.hashSync("centro2026", 10);
const { rows: hospitales } = await db.execute("SELECT id, nombre FROM hospitales");
for (const h of hospitales) {
  await db.execute({
    sql: "INSERT INTO usuarios (email, clave_hash, nombre, rol, hospital_id) VALUES (?, ?, ?, 'centro', ?) ON CONFLICT(email) DO NOTHING",
    args: [`centro${h.id}@centro.mil.ve`, claveCentro, String(h.nombre), Number(h.id)],
  });
}

console.log(`Listo: ${hospitales.length} centros, admin + usuarios por centro.`);
