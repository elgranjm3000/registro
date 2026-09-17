// Sincroniza la lista oficial de centros (34). Uso: node scripts/sincronizar-centros.mjs
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const db = createClient({
  url: process.env.DB_URL ?? "file:data/registros.db",
  authToken: process.env.DB_TOKEN,
});

const H = (nombre, ubicacion) => ({ nombre, ubicacion, tipo: "hospital" });
const A = (nombre, ubicacion) => ({ nombre, ubicacion, tipo: "ambulatorio" });
const O = (nombre, ubicacion) => ({ nombre, ubicacion, tipo: "otro" });

const LISTA = [
  H('HOSPITAL MILITAR TIPO IV UNIVERSITARIO "DR. CARLOS ARVELO"', "CARACAS, DTTO. CAPITAL"),
  H('HOSPITAL MILITAR TIPO I "DR. VICENTE SALIAS SANOJA"', "CARACAS, DTTO. CAPITAL"),
  H('HOSPITAL MILITAR "CNEL. ELBANO PAREDES VIVAS"', "MARACAY, EDO. ARAGUA"),
  H('HOSPITAL MILITAR TIPO I "TCNEL. DR. FRANCISCO VALBUENA"', "MARACAIBO, EDO. ZULIA"),
  H('HOSPITAL MILITAR TIPO II "CAP. GUILLERMO HERNÁNDEZ JACOBSEN"', "SAN CRISTÓBAL, EDO. TÁCHIRA"),
  H('HOSPITAL MILITAR TIPO III "DR. JOSÉ ÁNGEL ÁLAMO"', "BARQUISIMETO, EDO. LARA"),
  H('HOSPITAL MILITAR TIPO I "DR. JOSÉ MARÍA VARGAS"', "SAN JUAN DE LOS MORROS, EDO. GUÁRICO"),
  H('HOSPITAL MILITAR TIPO I "CNEL. NELSON SAYAGO MORA"', "LA ASUNCIÓN, EDO. NUEVA ESPARTA"),
  H('HOSPITAL NAVAL TIPO I "DR. RAÚL PERDOMO HURTADO"', "CATIA LA MAR, EDO. LA GUAIRA"),
  H('HOSPITAL NAVAL TIPO I "DR. FRANCISCO ISNARDI"', "PUERTO CABELLO, EDO. CARABOBO"),
  H('HOSPITAL NAVAL TIPO I "DR. PEDRO MANUEL CHIRINOS"', "PUNTO FIJO, EDO. FALCÓN"),
  H('HOSPITAL NAVAL TIPO I "CN. FRANCISCO JAVIER GUTIÉRREZ"', "GUIRIA, EDO. SUCRE"),
  H('HOSPITAL MILITAR TIPO I "CNEL. JORGE MARCANO"', "BARCELONA, EDO. ANZOÁTEGUI"),
  H('HOSPITAL MILITAR TIPO I "DR. MANUEL SIVERIO CASTILLO"', "PUERTO ORDAZ, EDO. BOLÍVAR"),
  H('HOSPITAL MILITAR "DR. MANUEL PALACIO FAJARDO"', "BARINAS, EDO. BARINAS"),
  A('AMBULATORIO MILITAR FRONTERIZO "DR. ALEJANDRO PRÓSPERO REVEREND"', "TUMEREMO, EDO. GUYANA ESEQUIBA"),
  A('AMBULATORIO MILITAR "TCNEL. PEDRO BARCENAS BARRETO"', "ACARIGUA, EDO. PORTUGUESA"),
  A('AMBULATORIO MILITAR FRONTERIZO TIPO I "DR. JACINTO CONVIT GARCÍA"', "SANTA ELENA DE UAIRÉN, EDO. BOLÍVAR"),
  A('AMBULATORIO MILITAR FRONTERIZO "MANUEL DARÍO MALDONADO"', "PUERTO PÁEZ, EDO. APURE"),
  A('AMBULATORIO MILITAR "DR. FELIPE TAMARIZ"', "SANTA LUCÍA, EDO. MIRANDA"),
  A('AMBULATORIO MILITAR "DR. CERVELLÓN URBINA"', "NAGUANAGUA, EDO. CARABOBO"),
  A('AMBULATORIO MILITAR "CONCEPCIÓN MARIÑO"', "CARÚPANO, EDO. SUCRE"),
  A('AMBULATORIO MILITAR "LA ROSALEDA"', "SAN ANTONIO DE LOS ALTOS, EDO. MIRANDA"),
  A('AMBULATORIO MILITAR "DR. JOSÉ RAFAEL VILLAREAL"', "MATURÍN, EDO. MONAGAS"),
  A('AMBULATORIO MILITAR "AMAZONAS"', "PUERTO AYACUCHO, EDO. AMAZONAS"),
  A('AMBULATORIO MILITAR "DR. LISANDRO ALVARADO"', "SAN FELIPE, EDO. YARACUY"),
  A('AMBULATORIO MILITAR "DR. HUMBERTO FERNÁNDEZ MORÁN"', "SAN CARLOS, EDO. COJEDES"),
  A('AMBULATORIO MILITAR FRONTERIZO "DR. LUIZ RAZETTI"', "TUCUPITA, EDO. DELTA AMACURO"),
  O('NÚCLEO MÉDICO ASISTENCIAL "MY. LEONARDO JOSÉ GÓMEZ CALDERÓN"', "MÉRIDA, EDO. MÉRIDA"),
  O('NÚCLEO MÉDICO ASISTENCIAL "DR. JOSÉ GREGORIO HERNÁNDEZ"', "TRUJILLO, EDO. TRUJILLO"),
  O('NÚCLEO MÉDICO ASISTENCIAL "TCNEL. CÉSAR ANDRÉS BELLO D\'ESCRIVAN"', "CIUDAD BOLÍVAR, EDO. BOLÍVAR"),
  O('NÚCLEO MÉDICO ASISTENCIAL "GUASDUALITO"', "GUASDUALITO, EDO. APURE"),
  O('CASA HOGAR DEL ADULTO MAYOR AÑOS DORADOS "LA GUAIRA"', "LA GUAIRA, EDO. LA GUAIRA"),
  O('CASA HOGAR DEL ADULTO MAYOR AÑOS DORADOS "CARABOBO"', "EDO. CARABOBO"),
];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const claveCentro = bcrypt.hashSync("centro2026", 10);

// Palabras clave para emparejar centros existentes con la lista oficial
const ALIAS = {
  1: "carlosarvelo", 2: "vientesalias", 3: "elbanoparedes", 4: "valbuena",
  5: "guillermonhernandez", 6: "alamo", 7: "josemariavargas", 8: "nelsonsayago",
  9: "chirinos", 10: "siverio", 11: "perdomo", 12: "isnardi",
  13: "amazonas", 14: "concepcionmarino", 15: "gomezcalderon", 16: "guasdualito",
  17: "anosdoradoscarabobo",
};

const { rows: actuales } = await db.execute("SELECT id, nombre FROM hospitales ORDER BY id");

let actualizados = 0, insertados = 0;
const usados = new Set();

for (const h of actuales) {
  const alias = ALIAS[Number(h.id)];
  const objetivo = alias
    ? LISTA.find((l) => norm(l.nombre).includes(alias) && !usados.has(l))
    : undefined;
  if (objetivo) {
    usados.add(objetivo);
    if (norm(objetivo.nombre) !== norm(String(h.nombre))) {
      await db.execute({
        sql: "UPDATE hospitales SET nombre=?, ubicacion=?, tipo=? WHERE id=?",
        args: [objetivo.nombre, objetivo.ubicacion, objetivo.tipo, h.id],
      });
      actualizados++;
    }
  }
}

for (const c of LISTA) {
  if (usados.has(c)) continue;
  const { rows: dup } = await db.execute({
    sql: "SELECT id FROM hospitales WHERE nombre = ?",
    args: [c.nombre],
  });
  if (dup.length) continue;
  await db.execute({
    sql: "INSERT INTO hospitales (nombre, tipo, ubicacion, creado_en) VALUES (?, ?, ?, ?)",
    args: [c.nombre, c.tipo, c.ubicacion, new Date().toISOString()],
  });
  insertados++;
}

// Usuario de acceso por centro (uno por hospital, no duplica)
const { rows: hospitales } = await db.execute("SELECT id, nombre FROM hospitales ORDER BY id");
let usuariosCreados = 0;
for (const h of hospitales) {
  const email = `centro${h.id}@centro.mil.ve`;
  const { rows: ex } = await db.execute({ sql: "SELECT id FROM usuarios WHERE email=?", args: [email] });
  if (ex.length) continue;
  await db.execute({
    sql: "INSERT INTO usuarios (email, clave_hash, nombre, rol, hospital_id) VALUES (?, ?, ?, 'centro', ?)",
    args: [email, claveCentro, String(h.nombre), Number(h.id)],
  });
  usuariosCreados++;
}

console.log(`Centros: ${hospitales.length} · actualizados: ${actualizados} · nuevos: ${insertados} · usuarios nuevos: ${usuariosCreados}`);
