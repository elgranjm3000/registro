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

// ─── Reporte semanal: se recalcula a partir de las filas de servicios cargadas ───
// Todo lo cargado entra directo (sin flujo de aprobación).
export async function sincronizarReporte(hospitalId: number, semanaDesde: string) {
  const semanaHasta = viernesDe(semanaDesde);

  const filas = await db
    .select()
    .from(consultas)
    .where(and(eq(consultas.hospitalId, hospitalId), eq(consultas.semanaDesde, semanaDesde)));

  const sumaPor = (tipo: string) => ({
    m: filas.filter((f) => f.tipo === tipo).reduce((a, f) => a + f.militar, 0),
    a: filas.filter((f) => f.tipo === tipo).reduce((a, f) => a + f.afiliado, 0),
    p: filas.filter((f) => f.tipo === tipo).reduce((a, f) => a + f.pna, 0),
  });
  const c = sumaPor("consultas");
  const i = sumaPor("intervenciones");
  const h = sumaPor("hospitalizaciones");

  const valores = {
    consultasMilitar: c.m, consultasAfiliado: c.a, consultasPna: c.p,
    intervencionesMilitar: i.m, intervencionesAfiliado: i.a, intervencionesPna: i.p,
    hospitalizacionesMilitar: h.m, hospitalizacionesAfiliado: h.a, hospitalizacionesPna: h.p,
  };
  const total = Object.values(valores).reduce((a, b) => a + b, 0);

  const [existente] = await db
    .select()
    .from(reportes)
    .where(and(eq(reportes.hospitalId, hospitalId), eq(reportes.semanaDesde, semanaDesde)));

  if (existente) {
    await db
      .update(reportes)
      .set({ ...valores, semanaHasta, actualizadoEn: new Date().toISOString() })
      .where(eq(reportes.id, existente.id));
  } else if (total > 0) {
    await db.insert(reportes).values({ hospitalId: hospitalId ?? 0, semanaDesde, semanaHasta, ...valores });
  }
  revalidatePath("/consultas");
  revalidatePath("/reportar");
  revalidatePath("/panel");
}

// Guarda las filas de servicios del centro (especialidad + tipo + cantidades).
export async function accionGuardarCifras(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro" || !sesion.hospitalId)
    return { error: "Sesión no válida." };

  const semanaDesde = String(fd.get("semanaDesde") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semanaDesde)) return { error: "Indica la semana (lunes)." };
  const hospitalId: number = sesion.hospitalId;

  const numero = (k: string) => {
    const n = Math.round(Number(fd.get(k) ?? 0) || 0);
    return n < 0 ? 0 : n;
  };

  const [yaEnviado] = await db
    .select()
    .from(reportes)
    .where(and(eq(reportes.hospitalId, hospitalId), eq(reportes.semanaDesde, semanaDesde)));
  const soloAgregar = !!yaEnviado && yaEnviado.estado !== "rechazado";

  const espLista = await db.select().from(especialidades).where(eq(especialidades.activa, true));
  const espValidas = new Map(espLista.map((e) => [e.id, e.nombre]));
  const TIPOS = ["consultas", "intervenciones", "hospitalizaciones"] as const;

  // Recolecta las filas enviadas (fila-<i>-esp/tipo/m/a/p)
  const filas: { especialidadId: number; tipo: string; m: number; a: number; p: number }[] = [];
  let totalServicios = 0;
  for (let n = 0; n < 200; n++) {
    const espId = Number(fd.get(`fila-${n}-esp`) ?? 0);
    const tipo = String(fd.get(`fila-${n}-tipo`) ?? "");
    const m = numero(`fila-${n}-m`);
    const a = numero(`fila-${n}-a`);
    const p = numero(`fila-${n}-p`);
    if (!espId) continue;
    if (!espValidas.has(espId)) return { error: "Hay una fila con especialidad inválida." };
    if (!TIPOS.includes(tipo as (typeof TIPOS)[number]))
      return { error: "Hay una fila con tipo inválido (Consulta / Intervención / Hospitalización)." };
    if (m + a + p === 0) continue;
    filas.push({ especialidadId: espId, tipo, m, a, p });
    totalServicios += m + a + p;
  }

  if (soloAgregar) {
    // Semana ya enviada: lo enviado no se edita ni elimina; solo se agregan servicios nuevos
    const existentes = await db
      .select()
      .from(consultas)
      .where(and(eq(consultas.hospitalId, hospitalId), eq(consultas.semanaDesde, semanaDesde)));
    const claveExistente = new Set(existentes.map((c) => `${c.especialidadId}|${c.tipo}`));
    const nuevas = filas.filter((f) => !claveExistente.has(`${f.especialidadId}|${f.tipo}`));
    if (nuevas.length > 0) {
      await db.insert(consultas).values(
        nuevas.map((f) => ({
          hospitalId,
          especialidadId: f.especialidadId,
          tipo: f.tipo as "consultas" | "intervenciones" | "hospitalizaciones",
          semanaDesde,
          militar: f.m,
          afiliado: f.a,
          pna: f.p,
        })),
      );
    }
  } else {
    // Semana nueva o devuelta para corrección: reemplaza todo por lo enviado
    await db
      .delete(consultas)
      .where(and(eq(consultas.hospitalId, hospitalId), eq(consultas.semanaDesde, semanaDesde)));
    if (filas.length > 0) {
      await db.insert(consultas).values(
        filas.map((f) => ({
          hospitalId,
          especialidadId: f.especialidadId,
          tipo: f.tipo as "consultas" | "intervenciones" | "hospitalizaciones",
          semanaDesde,
          militar: f.m,
          afiliado: f.a,
          pna: f.p,
        })),
      );
    }
  }

  await db
    .update(reportes)
    .set({ estado: "pendiente", actualizadoEn: new Date().toISOString() })
    .where(and(eq(reportes.hospitalId, hospitalId), eq(reportes.semanaDesde, semanaDesde)));

  await sincronizarReporte(sesion.hospitalId, semanaDesde);
  revalidatePath("/consultas");
  if (totalServicios === 0)
    return { ok: "Sin filas nuevas que guardar." };
  return {
    ok: soloAgregar
      ? "Servicios agregados a la semana enviada. Lo ya enviado permanece sin cambios."
      : `Cifras enviadas (${totalServicios} servicios). La semana quedó registrada; para editarla, solicita a la Sala Situacional.`,
  };
}

// El admin reabre una carga para que el centro la corrija (estado: rechazado = abierta)
export async function accionAbrirReporte(fd: FormData) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin") return;
  const id = Number(fd.get("id"));
  if (!id) return;
  await db
    .update(reportes)
    .set({
      estado: "rechazado",
      observacionAdmin: String(fd.get("observacionAdmin") ?? "Abierta para corrección"),
      actualizadoEn: new Date().toISOString(),
    })
    .where(eq(reportes.id, id));
  revalidatePath("/panel");
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

    const TIPOS_XL: Record<string, string> = {
      consulta: "consultas", consultas: "consultas",
      intervencion: "intervenciones", intervenciones: "intervenciones",
      hospitalizacion: "hospitalizaciones", hospitalizaciones: "hospitalizaciones",
    };
    const tipo = TIPOS_XL[normalizar(String(celda["tipo"] ?? "consulta"))] ?? "consultas";
    await db
      .insert(consultas)
      .values({ hospitalId, especialidadId, tipo: tipo as "consultas", semanaDesde, militar: m, afiliado: a, pna: p })
      .onConflictDoUpdate({
        target: [consultas.hospitalId, consultas.especialidadId, consultas.tipo, consultas.semanaDesde],
        set: { militar: m, afiliado: a, pna: p, actualizadoEn: new Date().toISOString() },
      });
    const set = semanasPorHospital.get(hospitalId) ?? new Set<string>();
    set.add(semanaDesde);
    semanasPorHospital.set(hospitalId, set);
    cargadas++;
  }

  for (const [hospitalId, semanas] of semanasPorHospital)
    // requiereCentro=true ⇒ importa el admin ⇒ entra verificado
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
