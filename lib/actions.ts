"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bitacora, consultas, especialidades, hospitales, reportes } from "@/lib/db/schema";
import { crearSesion, cerrarSesion, getSesion, verificarClave } from "@/lib/auth";

export type EstadoForm = { error?: string; ok?: string };

// ─── Bitácora de accesos ───
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
  redirect(sesion.rol === "admin" ? "/panel" : "/consultas");
}

export async function accionSalir() {
  const sesion = await getSesion();
  if (sesion) await registrarBitacora(sesion.email, sesion.rol, sesion.hospitalId, "salir");
  await cerrarSesion();
  redirect("/login");
}

// ─── Semanas ───
import { viernesDe } from "@/lib/fechas";

// ─── Reporte semanal: se recalcula y envía (pendiente) solo al guardar cifras ───
export async function sincronizarReporte(hospitalId: number, semanaDesde: string) {
  const semanaHasta = viernesDe(semanaDesde);

  // Consultas: suma de todas las especialidades cargadas esa semana
  const filas = await db
    .select()
    .from(consultas)
    .where(and(eq(consultas.hospitalId, hospitalId), eq(consultas.semanaDesde, semanaDesde)));
  const cM = filas.reduce((a, f) => a + f.militar, 0);
  const cA = filas.reduce((a, f) => a + f.afiliado, 0);
  const cP = filas.reduce((a, f) => a + f.pna, 0);

  const [existente] = await db
    .select()
    .from(reportes)
    .where(and(eq(reportes.hospitalId, hospitalId), eq(reportes.semanaDesde, semanaDesde)));

  if (existente && existente.estado === "verificado") return; // lo verificado no se toca

  // Intervenciones/hospitalizaciones: se conservan las cifras ya cargadas
  const iM = existente?.intervencionesMilitar ?? 0;
  const iA = existente?.intervencionesAfiliado ?? 0;
  const iP = existente?.intervencionesPna ?? 0;
  const hM = existente?.hospitalizacionesMilitar ?? 0;
  const hA = existente?.hospitalizacionesAfiliado ?? 0;
  const hP = existente?.hospitalizacionesPna ?? 0;

  if (existente) {
    await db
      .update(reportes)
      .set({
        consultasMilitar: cM, consultasAfiliado: cA, consultasPna: cP,
        intervencionesMilitar: iM, intervencionesAfiliado: iA, intervencionesPna: iP,
        hospitalizacionesMilitar: hM, hospitalizacionesAfiliado: hA, hospitalizacionesPna: hP,
        semanaHasta,
        estado: "pendiente",
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(reportes.id, existente.id));
  } else if (cM + cA + cP + iM + iA + iP + hM + hA + hP > 0) {
    await db.insert(reportes).values({
      hospitalId,
      semanaDesde,
      semanaHasta,
      consultasMilitar: cM, consultasAfiliado: cA, consultasPna: cP,
      intervencionesMilitar: iM, intervencionesAfiliado: iA, intervencionesPna: iP,
      hospitalizacionesMilitar: hM, hospitalizacionesAfiliado: hA, hospitalizacionesPna: hP,
    });
  }
  revalidatePath("/consultas");
  revalidatePath("/reportar");
  revalidatePath("/panel");
}

// Guarda las cantidades del centro: consultas por especialidad + intervenciones y
// hospitalizaciones por categoría. El reporte se envía automáticamente (pendiente).
export async function accionGuardarCifras(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro" || !sesion.hospitalId)
    return { error: "Sesión no válida." };

  const semanaDesde = String(fd.get("semanaDesde") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semanaDesde)) return { error: "Indica la semana (lunes)." };

  const numero = (k: string) => {
    const n = Math.round(Number(fd.get(k) ?? 0) || 0);
    return n < 0 ? 0 : n;
  };

  // Intervenciones y hospitalizaciones
  const interv = {
    intervencionesMilitar: numero("intervMilitar"),
    intervencionesAfiliado: numero("intervAfiliado"),
    intervencionesPna: numero("intervPna"),
    hospitalizacionesMilitar: numero("hospMilitar"),
    hospitalizacionesAfiliado: numero("hospAfiliado"),
    hospitalizacionesPna: numero("hospPna"),
  };

  // Consultas por especialidad (inputs llamados esp-<id> con "m,a,p")
  const activas = await db.select().from(especialidades).where(eq(especialidades.activa, true));
  let totalConsultas = 0;
  for (const e of activas) {
    const m = numero(`esp-${e.id}-m`);
    const a = numero(`esp-${e.id}-a`);
    const p = numero(`esp-${e.id}-p`);
    totalConsultas += m + a + p;
    if (m + a + p === 0) {
      await db
        .delete(consultas)
        .where(
          and(
            eq(consultas.hospitalId, sesion.hospitalId),
            eq(consultas.especialidadId, e.id),
            eq(consultas.semanaDesde, semanaDesde),
          ),
        );
      continue;
    }
    await db
      .insert(consultas)
      .values({ hospitalId: sesion.hospitalId, especialidadId: e.id, semanaDesde, militar: m, afiliado: a, pna: p })
      .onConflictDoUpdate({
        target: [consultas.hospitalId, consultas.especialidadId, consultas.semanaDesde],
        set: { militar: m, afiliado: a, pna: p, actualizadoEn: new Date().toISOString() },
      });
  }

  // Aplica intervenciones/hospitalizaciones al reporte y recalcula consultas
  const [existente] = await db
    .select()
    .from(reportes)
    .where(and(eq(reportes.hospitalId, sesion.hospitalId), eq(reportes.semanaDesde, semanaDesde)));
  if (existente && existente.estado === "verificado")
    return { error: "El reporte de esta semana ya fue verificado. Contacta a la Sala Situacional." };

  await db
    .insert(reportes)
    .values({
      hospitalId: sesion.hospitalId,
      semanaDesde,
      semanaHasta: viernesDe(semanaDesde),
      ...interv,
    })
    .onConflictDoUpdate({
      target: [reportes.hospitalId, reportes.semanaDesde],
      set: {
        ...interv,
        semanaHasta: viernesDe(semanaDesde),
        estado: "pendiente",
        actualizadoEn: new Date().toISOString(),
      },
    });

  await sincronizarReporte(sesion.hospitalId, semanaDesde);
  revalidatePath("/consultas");
  return { ok: `Cifras guardadas (${totalConsultas} consultas). Reporte enviado a verificación.` };
}

// ─── Especialidades (admin) ───
export async function accionCrearEspecialidad(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") return { error: "Solo el admin." };
  const nombre = String(fd.get("nombre") ?? "").trim().toUpperCase();
  if (nombre.length < 3) return { error: "Nombre muy corto." };
  await db.insert(especialidades).values({ nombre }).onConflictDoNothing();
  revalidatePath("/panel");
  revalidatePath("/consultas");
  return { ok: `Especialidad ${nombre} agregada.` };
}

// ─── Excel ───
export type ResultadoExcel = { ok?: string; error?: string; detalle?: string[] };

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// Importa el Excel de consultas por especialidad (una fila: Centro?, Especialidad, M, A, PNA)
async function importarConsultas(filas: Record<string, unknown>[], requiereCentro: boolean, hospitalFijo?: number) {
  const centros = await db.select().from(hospitales);
  const porNombre = new Map(centros.map((c) => [normalizar(c.nombre), c.id]));
  const espLista = await db.select().from(especialidades);
  const espPorNombre = new Map(espLista.map((e) => [normalizar(e.nombre), e.id]));

  const detalle: string[] = [];
  const semanasPorHospital = new Map<number, Set<string>>();
  let cargadas = 0;

  for (const [i, fila] of filas.entries()) {
    const celda: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fila)) celda[normalizar(k)] = v;

    let hospitalId = hospitalFijo ?? null;
    if (requiereCentro) {
      const nombreCentro = String(celda["centro"] ?? celda["hospital"] ?? "").trim();
      if (!nombreCentro || normalizar(nombreCentro).startsWith("total")) continue;
      hospitalId = porNombre.get(normalizar(nombreCentro)) ?? null;
      if (!hospitalId) {
        detalle.push(`⚠ Fila ${i + 2}: el centro "${nombreCentro}" no existe; usa el desplegable.`);
        continue;
      }
    }
    if (!hospitalId) continue;

    const nombreEsp = String(celda["especialidad"] ?? "").trim();
    if (!nombreEsp) {
      detalle.push(`⚠ Fila ${i + 2}: sin especialidad; ignorada.`);
      continue;
    }
    const especialidadId = espPorNombre.get(normalizar(nombreEsp));
    if (!especialidadId) {
      detalle.push(`⚠ Fila ${i + 2}: la especialidad "${nombreEsp}" no existe (agrégala en el panel).`);
      continue;
    }
    const semanaDesde = String(celda["semana"] ?? celda["semanadesde"] ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(semanaDesde)) {
      detalle.push(`⚠ Fila ${i + 2}: columna Semana inválida (usa AAAA-MM-DD del lunes).`);
      continue;
    }
    const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
    const m = num(celda["militar"]);
    const a = num(celda["afiliado"]);
    const p = num(celda["pna"]);
    if (m + a + p === 0) continue;

    await db
      .insert(consultas)
      .values({ hospitalId, especialidadId, semanaDesde, militar: m, afiliado: a, pna: p })
      .onConflictDoUpdate({
        target: [consultas.hospitalId, consultas.especialidadId, consultas.semanaDesde],
        set: { militar: m, afiliado: a, pna: p, actualizadoEn: new Date().toISOString() },
      });
    const set = semanasPorHospital.get(hospitalId) ?? new Set<string>();
    set.add(semanaDesde);
    semanasPorHospital.set(hospitalId, set);
    cargadas++;
  }

  for (const [hospitalId, semanas] of semanasPorHospital)
    for (const s of semanas) await sincronizarReporte(hospitalId, s);

  revalidatePath("/consultas");
  revalidatePath("/panel");
  return {
    ok: `${cargadas} fila(s) de consultas cargadas en ${semanasPorHospital.size} centro(s).`,
    detalle: detalle.length ? detalle : undefined,
  };
}

export async function accionImportarConsultasCentro(_prev: ResultadoExcel, fd: FormData): Promise<ResultadoExcel> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro" || !sesion.hospitalId)
    return { error: "Sesión no válida." };
  const archivo = fd.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) return { error: "Selecciona un archivo .xlsx" };
  const XLSX = await import("xlsx");
  const libro = XLSX.read(Buffer.from(await archivo.arrayBuffer()), { type: "buffer" });
  const filas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { defval: "" });
  if (filas.length === 0) return { error: "El archivo no tiene filas de datos." };
  return importarConsultas(filas, false, sesion.hospitalId);
}

export async function accionImportarConsultasAdmin(_prev: ResultadoExcel, fd: FormData): Promise<ResultadoExcel> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") return { error: "Solo el admin puede importar." };
  const archivo = fd.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) return { error: "Selecciona un archivo .xlsx" };
  const XLSX = await import("xlsx");
  const libro = XLSX.read(Buffer.from(await archivo.arrayBuffer()), { type: "buffer" });
  const filas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { defval: "" });
  if (filas.length === 0) return { error: "El archivo no tiene filas de datos." };
  return importarConsultas(filas, true);
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
}
