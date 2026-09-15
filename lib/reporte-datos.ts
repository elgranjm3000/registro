import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { consultas, especialidades, hospitales, reportes } from "@/lib/db/schema";
import { viernesDe } from "@/lib/fechas";

export type TipoReporte = "todos" | "consultas" | "intervenciones" | "hospitalizaciones";

export type FilaCentro = {
  id: number;
  nombre: string;
  ubicacion: string;
  conDatos: boolean;
  consultas: number;
  intervenciones: number;
  hospitalizaciones: number;
  militar: number;
  afiliado: number;
  pna: number;
};

export type DatosReporte = {
  semana: string;
  semanaHasta: string;
  hospitalFiltro: string;
  tipo: TipoReporte;
  nombreHospital: string;
  tituloTipo: string;
  tiposIncluidos: string[];
  centros: FilaCentro[];
  cat: { Militar: number; Afiliado: number; PNA: number };
  granTotal: number;
  detalle: {
    hospital: string;
    especialidad: string;
    tipo: string;
    Militar: number;
    Afiliado: number;
    PNA: number;
  }[];
};

const ETIQUETA_TIPO: Record<string, string> = {
  consultas: "Consulta",
  intervenciones: "Intervención",
  hospitalizaciones: "Hospitalización",
};

// Datos consolidados del reporte semanal (usado por la vista de impresión y el PDF)
export async function obtenerDatosReporte(opts: {
  semana: string;
  hospital?: string;
  tipo?: string;
}): Promise<DatosReporte> {
  const semana = opts.semana;
  const hospitalFiltro = opts.hospital ?? "todos";
  const tipo: TipoReporte =
    opts.tipo === "consultas" || opts.tipo === "intervenciones" || opts.tipo === "hospitalizaciones"
      ? opts.tipo
      : "todos";
  const semanaHasta = viernesDe(semana);
  const tiposIncluidos =
    tipo === "todos" ? ["consultas", "intervenciones", "hospitalizaciones"] : [tipo];

  const centros = await db.select().from(hospitales).orderBy(hospitales.nombre);

  const condiciones: SQL[] = [eq(reportes.semanaDesde, semana)];
  if (hospitalFiltro !== "todos") condiciones.push(eq(reportes.hospitalId, Number(hospitalFiltro)));
  const filas = await db
    .select({ r: reportes, h: hospitales })
    .from(reportes)
    .innerJoin(hospitales, eq(reportes.hospitalId, hospitales.id))
    .where(and(...condiciones));
  const repPorHospital = new Map(filas.map((f) => [f.h.id, f.r]));

  const num = (r: typeof reportes.$inferSelect | undefined, tt: string, cat: string) =>
    r ? Number(r[`${tt}${cat}` as keyof typeof r]) : 0;

  const centrosFila: FilaCentro[] = (
    hospitalFiltro === "todos" ? centros.filter((c) => c.activo) : filas.map((f) => f.h)
  ).map((h) => {
    const r = repPorHospital.get(h.id);
    const sumaTipo = (tt: string) => num(r, tt, "Militar") + num(r, tt, "Afiliado") + num(r, tt, "PNA");
    return {
      id: h.id,
      nombre: h.nombre,
      ubicacion: h.ubicacion,
      conDatos: !!r,
      consultas: tipo === "todos" ? sumaTipo("consultas") : tipo === "consultas" ? sumaTipo("consultas") : 0,
      intervenciones: tipo === "todos" ? sumaTipo("intervenciones") : tipo === "intervenciones" ? sumaTipo("intervenciones") : 0,
      hospitalizaciones: tipo === "todos" ? sumaTipo("hospitalizaciones") : tipo === "hospitalizaciones" ? sumaTipo("hospitalizaciones") : 0,
      militar: tiposIncluidos.reduce((a, tt) => a + num(r, tt, "Militar"), 0),
      afiliado: tiposIncluidos.reduce((a, tt) => a + num(r, tt, "Afiliado"), 0),
      pna: tiposIncluidos.reduce((a, tt) => a + num(r, tt, "PNA"), 0),
    };
  });

  const cat = { Militar: 0, Afiliado: 0, PNA: 0 };
  for (const f of centrosFila) {
    cat.Militar += f.militar;
    cat.Afiliado += f.afiliado;
    cat.PNA += f.pna;
  }
  const granTotal = cat.Militar + cat.Afiliado + cat.PNA;

  // Detalle por especialidad × hospital × servicio
  const tiposDetalle = tipo === "todos" ? ["consultas", "intervenciones", "hospitalizaciones"] : [tipo];
  const condicionesC: SQL[] = [eq(consultas.semanaDesde, semana)];
  if (hospitalFiltro !== "todos") condicionesC.push(eq(consultas.hospitalId, Number(hospitalFiltro)));
  const filasC = await db
    .select({ c: consultas, e: especialidades })
    .from(consultas)
    .innerJoin(especialidades, eq(consultas.especialidadId, especialidades.id))
    .where(and(...condicionesC));

  const nombreHospitalDe = new Map(centros.map((c) => [c.id, c.nombre]));
  const detalleMap = new Map<
    string,
    { hospital: string; especialidad: string; tipo: string; Militar: number; Afiliado: number; PNA: number }
  >();
  for (const f of filasC) {
    if (!tiposDetalle.includes(f.c.tipo)) continue;
    const clave = `${f.c.hospitalId}-${f.e.id}-${f.c.tipo}`;
    const acc =
      detalleMap.get(clave) ?? {
        hospital: nombreHospitalDe.get(f.c.hospitalId) ?? "—",
        especialidad: f.e.nombre,
        tipo: ETIQUETA_TIPO[f.c.tipo],
        Militar: 0,
        Afiliado: 0,
        PNA: 0,
      };
    acc.Militar += f.c.militar;
    acc.Afiliado += f.c.afiliado;
    acc.PNA += f.c.pna;
    detalleMap.set(clave, acc);
  }

  const nombreHospital =
    hospitalFiltro === "todos"
      ? "TODOS LOS CENTROS"
      : (centros.find((c) => c.id === Number(hospitalFiltro))?.nombre ?? "").toUpperCase();

  return {
    semana,
    semanaHasta,
    hospitalFiltro,
    tipo,
    nombreHospital,
    tituloTipo: tipo === "todos" ? "ACTIVIDADES" : tipo.toUpperCase(),
    tiposIncluidos,
    centros: centrosFila,
    cat,
    granTotal,
    detalle: [...detalleMap.values()].sort(
      (a, b) => a.hospital.localeCompare(b.hospital) || a.especialidad.localeCompare(b.especialidad),
    ),
  };
}
