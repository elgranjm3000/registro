"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bitacora, hospitales, reportes } from "@/lib/db/schema";
import { crearSesion, cerrarSesion, getSesion, verificarClave } from "@/lib/auth";

export type EstadoForm = { error?: string; ok?: string };

async function registrarBitacora(
  email: string,
  rol: string,
  hospitalId: number | null,
  accion: "login_exitoso" | "login_fallido" | "salir",
) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
  await db.insert(bitacora).values({
    email,
    rol,
    hospitalId,
    accion,
    ip,
    navegador: (h.get("user-agent") ?? "").slice(0, 200),
  });
}

export async function accionLogin(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = String(fd.get("email") ?? "").toLowerCase().trim();
  const clave = String(fd.get("clave") ?? "");
  const sesion = await verificarClave(email, clave);
  if (!sesion) {
    await registrarBitacora(email, "", null, "login_fallido");
    return { error: "Correo o clave incorrectos." };
  }
  await registrarBitacora(email, sesion.rol, sesion.hospitalId, "login_exitoso");
  await crearSesion(sesion);
  redirect(sesion.rol === "admin" ? "/panel" : "/reportar");
}

export async function accionSalir() {
  const sesion = await getSesion();
  if (sesion) await registrarBitacora(sesion.email, sesion.rol, sesion.hospitalId, "salir");
  await cerrarSesion();
  redirect("/login");
}

const CAMPOS = [
  "consultasMilitar", "consultasAfiliado", "consultasPna",
  "intervencionesMilitar", "intervencionesAfiliado", "intervencionesPna",
  "hospitalizacionesMilitar", "hospitalizacionesAfiliado", "hospitalizacionesPna",
] as const;

// El reporte semanal se genera y envía (estado pendiente) automáticamente
// cada vez que cambia la lista de pacientes. No hay botón de envío.
export async function sincronizarReporte(hospitalId: number, fechaISO: string) {
  const { pacientes } = await import("@/lib/db/schema");
  const d = new Date(fechaISO + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const semanaDesde = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 4);
  const semanaHasta = d.toISOString().slice(0, 10);

  const registrados = await db
    .select()
    .from(pacientes)
    .where(
      and(
        eq(pacientes.hospitalId, hospitalId),
        gte(pacientes.fecha, semanaDesde),
        lte(pacientes.fecha, semanaHasta),
      ),
    );
  if (registrados.length === 0) return; // nada que reportar aún

  const valores: Record<string, number> = {};
  for (const c of CAMPOS) valores[c] = 0;
  for (const p of registrados) {
    const suf = p.categoria === "militar" ? "Militar" : p.categoria === "afiliado" ? "Afiliado" : "Pna";
    valores[`${p.actividad}${suf}`] += 1;
  }

  const [existente] = await db
    .select()
    .from(reportes)
    .where(and(eq(reportes.hospitalId, hospitalId), eq(reportes.semanaDesde, semanaDesde)));

  if (existente && existente.estado === "verificado") return; // lo verificado no se toca

  if (existente) {
    await db
      .update(reportes)
      .set({ ...valores, semanaHasta, estado: "pendiente", actualizadoEn: new Date().toISOString() })
      .where(eq(reportes.id, existente.id));
  } else {
    await db.insert(reportes).values({ hospitalId, semanaDesde, semanaHasta, ...valores });
  }
  revalidatePath("/reportar");
  revalidatePath("/panel");
}

export async function accionRevisarReporte(fd: FormData) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") return;
  const id = Number(fd.get("id"));
  const estado = String(fd.get("estado"));
  if (!id || !["verificado", "rechazado"].includes(estado)) return;
  await db
    .update(reportes)
    .set({
      estado: estado as "verificado" | "rechazado",
      observacionAdmin: String(fd.get("observacionAdmin") ?? ""),
      verificadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    })
    .where(eq(reportes.id, id));
  revalidatePath("/panel");
  revalidatePath("/panel/reportes");
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

const COLUMNAS: [string, keyof typeof reportes.$inferInsert][] = [
  ["consultasmilitar", "consultasMilitar"],
  ["consultasafiliado", "consultasAfiliado"],
  ["consultaspna", "consultasPna"],
  ["intervencionesmilitar", "intervencionesMilitar"],
  ["intervencionesafiliado", "intervencionesAfiliado"],
  ["intervencionespna", "intervencionesPna"],
  ["hospitalizacionesmilitar", "hospitalizacionesMilitar"],
  ["hospitalizacionesafiliado", "hospitalizacionesAfiliado"],
  ["hospitalizacionespna", "hospitalizacionesPna"],
];

export type ResultadoExcel = { ok?: string; error?: string; detalle?: string[] };

export async function accionImportarExcel(_prev: ResultadoExcel, fd: FormData): Promise<ResultadoExcel> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") return { error: "Solo el admin puede importar." };

  const semanaDesde = String(fd.get("semanaDesde") ?? "");
  if (!semanaDesde) return { error: "Indica la semana (lunes) de los datos." };
  const d = new Date(semanaDesde + "T12:00:00");
  d.setDate(d.getDate() + 4);
  const semanaHasta = d.toISOString().slice(0, 10);

  const archivo = fd.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) return { error: "Selecciona un archivo .xlsx" };

  const XLSX = await import("xlsx");
  const libro = XLSX.read(Buffer.from(await archivo.arrayBuffer()), { type: "buffer" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(hoja, { defval: 0 });

  const centros = await db.select().from(hospitales);
  const porNombre = new Map(centros.map((c) => [normalizar(c.nombre), c.id]));

  const detalle: string[] = [];
  let cargados = 0;

  for (const fila of filas) {
    const celdas: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fila)) celdas[normalizar(k)] = v;

    const nombreCentro = String(
      celdas["centro"] ?? celdas["hospital"] ?? celdas["centrosdesalud"] ?? "",
    ).trim();
    if (!nombreCentro) continue;
    if (normalizar(nombreCentro).startsWith("total")) continue; // fila TOTAL del formato

    const hospitalId = porNombre.get(normalizar(nombreCentro));
    if (!hospitalId) {
      detalle.push(`⚠ ${nombreCentro}: no coincide con ningún centro registrado.`);
      continue;
    }

    const valores: Record<string, number> = {};
    let valida = true;
    for (const [clave, campo] of COLUMNAS) {
      const n = Math.round(Number(celdas[clave] ?? 0) || 0);
      if (n < 0) valida = false;
      valores[campo] = n;
    }
    if (!valida) {
      detalle.push(`⚠ ${nombreCentro}: hay valores negativos; fila ignorada.`);
      continue;
    }

    const [existente] = await db
      .select()
      .from(reportes)
      .where(and(eq(reportes.hospitalId, hospitalId), eq(reportes.semanaDesde, semanaDesde)));

    if (existente && existente.estado === "verificado") {
      detalle.push(`↷ ${nombreCentro}: ya tenía reporte verificado; no se tocó.`);
      continue;
    }

    if (existente) {
      await db
        .update(reportes)
        .set({
          ...valores,
          semanaHasta,
          estado: "verificado",
          observacionAdmin: "Cargado por la Sala Situacional vía Excel",
          verificadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(reportes.id, existente.id));
    } else {
      await db.insert(reportes).values({
        hospitalId,
        semanaDesde,
        semanaHasta,
        ...valores,
        estado: "verificado",
        observacionAdmin: "Cargado por la Sala Situacional vía Excel",
        verificadoEn: new Date().toISOString(),
      });
    }
    cargados++;
  }

  revalidatePath("/panel");
  return {
    ok: `${cargados} centros cargados para la semana del ${semanaDesde}.`,
    detalle: detalle.length ? detalle : undefined,
  };
}

// ─── Pacientes ───
export async function accionRegistrarPaciente(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro" || !sesion.hospitalId)
    return { error: "Sesión no válida." };

  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Indica el nombre del paciente." };
  const categoria = String(fd.get("categoria") ?? "");
  const actividad = String(fd.get("actividad") ?? "");
  const fecha = String(fd.get("fecha") ?? "");
  if (!["militar", "afiliado", "pna"].includes(categoria))
    return { error: "Selecciona la categoría (Militar / Afiliado / PNA)." };
  if (!["consultas", "intervenciones", "hospitalizaciones"].includes(actividad))
    return { error: "Selecciona la actividad." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Indica la fecha de atención." };

  const edad = Number(fd.get("edad") ?? 0) || null;
  const { pacientes } = await import("@/lib/db/schema");
  await db.insert(pacientes).values({
    hospitalId: sesion.hospitalId,
    nombre,
    cedula: String(fd.get("cedula") ?? "").trim(),
    edad,
    sexo: String(fd.get("sexo") ?? "M") === "F" ? "F" : "M",
    categoria: categoria as "militar" | "afiliado" | "pna",
    actividad: actividad as "consultas" | "intervenciones" | "hospitalizaciones",
    fecha,
  });
  revalidatePath("/pacientes");
  await sincronizarReporte(sesion.hospitalId, fecha);
  return { ok: `Paciente ${nombre} registrado. Reporte semanal actualizado automáticamente.` };
}

export async function accionEliminarPaciente(fd: FormData) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro" || !sesion.hospitalId) return;
  const id = Number(fd.get("id"));
  const { pacientes } = await import("@/lib/db/schema");
  // Solo puede borrar pacientes de su propio centro
  await db
    .delete(pacientes)
    .where(and(eq(pacientes.id, id), eq(pacientes.hospitalId, sesion.hospitalId)));
  revalidatePath("/pacientes");
  await sincronizarReporte(sesion.hospitalId, new Date().toISOString().slice(0, 10));
}

// ─── Carga masiva de pacientes vía Excel (por centro) ───
export type ResultadoPacientes = { ok?: string; error?: string; detalle?: string[] };

const CATEGORIAS_XL: Record<string, string> = {
  militar: "militar",
  m: "militar",
  afiliado: "afiliado",
  a: "afiliado",
  pna: "pna",
  p: "pna",
};

const ACTIVIDADES_XL: Record<string, string> = {
  consulta: "consultas",
  consultas: "consultas",
  intervencion: "intervenciones",
  intervenciones: "intervenciones",
  hospitalizacion: "hospitalizaciones",
  hospitalizaciones: "hospitalizaciones",
};

function parseFecha(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/](\d{1,2})[/](\d{2,4})$/);
  if (m) {
    const anio = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${anio}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; // dd/mm/yyyy
  }
  return null;
}

export async function accionImportarPacientes(_prev: ResultadoPacientes, fd: FormData): Promise<ResultadoPacientes> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro" || !sesion.hospitalId)
    return { error: "Sesión no válida." };

  const archivo = fd.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) return { error: "Selecciona un archivo .xlsx" };

  const XLSX = await import("xlsx");
  const libro = XLSX.read(Buffer.from(await archivo.arrayBuffer()), { type: "buffer" });
  const filas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
    libro.Sheets[libro.SheetNames[0]],
    { defval: "" },
  );
  if (filas.length === 0) return { error: "El archivo no tiene filas de datos." };

  const { pacientes } = await import("@/lib/db/schema");
  const detalle: string[] = [];
  const fechasValidas: string[] = [];
  let registrados = 0;

  for (const [i, fila] of filas.entries()) {
    const celda: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fila)) celda[normalizar(k)] = v;

    const nombre = String(celda["nombre"] ?? "").trim();
    if (!nombre) {
      detalle.push(`⚠ Fila ${i + 2}: sin nombre; ignorada.`);
      continue;
    }
    const categoria = CATEGORIAS_XL[normalizar(String(celda["categoria"] ?? ""))];
    if (!categoria) {
      detalle.push(`⚠ ${nombre}: categoría inválida (usa MILITAR, AFILIADO o PNA); ignorado.`);
      continue;
    }
    const actividad = ACTIVIDADES_XL[normalizar(String(celda["actividad"] ?? ""))];
    if (!actividad) {
      detalle.push(`⚠ ${nombre}: actividad inválida (usa Consulta, Intervención u Hospitalización); ignorado.`);
      continue;
    }
    const fecha = parseFecha(celda["fecha"]);
    if (!fecha) {
      detalle.push(`⚠ ${nombre}: fecha inválida (usa AAAA-MM-DD o DD/MM/AAAA); ignorado.`);
      continue;
    }

    await db.insert(pacientes).values({
      hospitalId: sesion.hospitalId,
      nombre,
      cedula: String(celda["cedula"] ?? celda["ci"] ?? "").trim(),
      edad: Number(celda["edad"]) || null,
      sexo: normalizar(String(celda["sexo"] ?? "")) === "f" ? "F" : "M",
      categoria: categoria as "militar" | "afiliado" | "pna",
      actividad: actividad as "consultas" | "intervenciones" | "hospitalizaciones",
      fecha,
    });
    fechasValidas.push(fecha);
    registrados++;
  }

  revalidatePath("/pacientes");
  // Sincroniza los reportes de las semanas con pacientes nuevos (registrados ya recolectados)
  const semanas = [...new Set(fechasValidas)].map((f) => {
    const d = new Date(f + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  });
  for (const s of semanas) await sincronizarReporte(sesion.hospitalId, s);
  return {
    ok: `${registrados} pacientes registrados. Reporte(s) semanal(es) actualizado(s) automáticamente.`,
    detalle: detalle.length ? detalle : undefined,
  };
}

// ─── Carga masiva de pacientes por el admin (con columna Centro) ───
export async function accionImportarPacientesAdmin(_prev: ResultadoPacientes, fd: FormData): Promise<ResultadoPacientes> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") return { error: "Solo el admin puede importar." };

  const archivo = fd.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) return { error: "Selecciona un archivo .xlsx" };

  const XLSX = await import("xlsx");
  const libro = XLSX.read(Buffer.from(await archivo.arrayBuffer()), { type: "buffer" });
  const filas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
    libro.Sheets[libro.SheetNames[0]],
    { defval: "" },
  );
  if (filas.length === 0) return { error: "El archivo no tiene filas de datos." };

  const { pacientes } = await import("@/lib/db/schema");
  const centros = await db.select().from(hospitales);
  const porNombre = new Map(centros.map((c) => [normalizar(c.nombre), c.id]));

  const detalle: string[] = [];
  const fechasPorHospital = new Map<number, string[]>(); // hospitalId → fechas a sincronizar
  let registrados = 0;

  for (const [i, fila] of filas.entries()) {
    const celda: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fila)) celda[normalizar(k)] = v;

    const nombreCentro = String(
      celda["centro"] ?? celda["hospital"] ?? celda["centrosdesalud"] ?? "",
    ).trim();
    if (!nombreCentro || normalizar(nombreCentro).startsWith("total")) continue;
    const hospitalId = porNombre.get(normalizar(nombreCentro));
    if (!hospitalId) {
      detalle.push(`⚠ Fila ${i + 2}: el centro "${nombreCentro}" no existe; usa el desplegable de la plantilla.`);
      continue;
    }

    const nombre = String(celda["nombre"] ?? "").trim();
    if (!nombre) {
      detalle.push(`⚠ Fila ${i + 2}: sin nombre; ignorada.`);
      continue;
    }
    const categoria = CATEGORIAS_XL[normalizar(String(celda["categoria"] ?? ""))];
    if (!categoria) {
      detalle.push(`⚠ ${nombre}: categoría inválida (usa MILITAR, AFILIADO o PNA); ignorado.`);
      continue;
    }
    const actividad = ACTIVIDADES_XL[normalizar(String(celda["actividad"] ?? ""))];
    if (!actividad) {
      detalle.push(`⚠ ${nombre}: actividad inválida (usa Consulta, Intervención u Hospitalización); ignorado.`);
      continue;
    }
    const fecha = parseFecha(celda["fecha"]);
    if (!fecha) {
      detalle.push(`⚠ ${nombre}: fecha inválida (usa AAAA-MM-DD o DD/MM/AAAA); ignorado.`);
      continue;
    }

    await db.insert(pacientes).values({
      hospitalId,
      nombre,
      cedula: String(celda["cedula"] ?? celda["ci"] ?? "").trim(),
      edad: Number(celda["edad"]) || null,
      sexo: normalizar(String(celda["sexo"] ?? "")) === "f" ? "F" : "M",
      categoria: categoria as "militar" | "afiliado" | "pna",
      actividad: actividad as "consultas" | "intervenciones" | "hospitalizaciones",
      fecha,
    });
    const previas = fechasPorHospital.get(hospitalId) ?? [];
    fechasPorHospital.set(hospitalId, [...previas, fecha]);
    registrados++;
  }

  revalidatePath("/panel");
  revalidatePath("/pacientes");
  // Sincroniza el reporte semanal de cada centro tocado
  for (const [hospitalId, fechas] of fechasPorHospital) {
    const semanas = [...new Set(fechas)].map((f) => {
      const d = new Date(f + "T12:00:00");
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return d.toISOString().slice(0, 10);
    });
    for (const s of semanas) await sincronizarReporte(hospitalId, s);
  }

  return {
    ok: `${registrados} pacientes cargados en ${fechasPorHospital.size} centro(s).`,
    detalle: detalle.length ? detalle : undefined,
  };
}
