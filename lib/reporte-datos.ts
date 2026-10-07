import { and, eq, gte, lte, type SQL } from "drizzle-orm";
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

export type CatPorTipo = { Militar: number; Afiliado: number; PNA: number; total: number };

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
  porTipo: Record<"consultas" | "intervenciones" | "hospitalizaciones", CatPorTipo>;
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
  consultas: "Consultas",
  intervenciones: "Intervenciones Qx",
  hospitalizaciones: "Hospitalizaciones",
};

// Datos consolidados del reporte (usado por la vista de impresión y el PDF).
// Acepta una semana (lunes) o un mes completo "AAAA-MM": suma todas las semanas cargadas del mes.
export async function obtenerDatosReporte(opts: {
  semana?: string;
  mes?: string;
  mesHasta?: string;
  anio?: string;
  especialidad?: string;
  hospital?: string;
  tipo?: string;
}): Promise<DatosReporte> {
  const mes = opts.mes && /^\d{4}-\d{2}$/.test(opts.mes) ? opts.mes : null;
  const mesHasta: string | null = mes
    ? opts.mesHasta && /^\d{4}-\d{2}$/.test(opts.mesHasta)
      ? opts.mesHasta
      : mes
    : null;
  const anio = opts.anio && /^\d{4}$/.test(opts.anio) ? opts.anio : null;
  const especialidadId = opts.especialidad && /^\d+$/.test(opts.especialidad) ? Number(opts.especialidad) : null;
  const semana = opts.semana ?? "";
  const hospitalFiltro = opts.hospital ?? "todos";
  const tipo: TipoReporte =
    opts.tipo === "consultas" || opts.tipo === "intervenciones" || opts.tipo === "hospitalizaciones"
      ? opts.tipo
      : "todos";
  const tiposIncluidos =
    tipo === "todos" ? ["consultas", "intervenciones", "hospitalizaciones"] : [tipo];

  const centros = await db.select().from(hospitales).orderBy(hospitales.nombre);

  const periodo: SQL[] = anio
    ? [gte(reportes.semanaDesde, `${anio}-01-01`), lte(reportes.semanaDesde, `${anio}-12-31`)]
    : mes
      ? [gte(reportes.semanaDesde, `${mes}-01`), lte(reportes.semanaDesde, `${mesHasta}-31`)]
      : [eq(reportes.semanaDesde, semana)];
  const condiciones: SQL[] = [...periodo];
  if (hospitalFiltro !== "todos") condiciones.push(eq(reportes.hospitalId, Number(hospitalFiltro)));
  const filas = await db
    .select({ r: reportes, h: hospitales })
    .from(reportes)
    .innerJoin(hospitales, eq(reportes.hospitalId, hospitales.id))
    .where(and(...condiciones));
  // Suma las semanas del periodo por hospital (para el reporte mensual)
  const sumasPorHospital = new Map<number, Record<string, number>>();
  for (const f of filas) {
    const acc = sumasPorHospital.get(f.h.id) ?? {};
    for (const tt of ["consultas", "intervenciones", "hospitalizaciones"])
      for (const c of ["Militar", "Afiliado", "Pna"])
        acc[`${tt}${c}`] = (acc[`${tt}${c}`] ?? 0) + Number(f.r[`${tt}${c}` as keyof typeof f.r]);
    sumasPorHospital.set(f.h.id, acc);
  }

  const num = (r: Record<string, number> | undefined, tt: string, cat: string) =>
    r ? (r[`${tt}${cat}`] ?? 0) : 0;

  const centrosFila: FilaCentro[] = (
    hospitalFiltro === "todos" ? centros.filter((c) => c.activo) : filas.map((f) => f.h)
  ).map((h) => {
    const r = sumasPorHospital.get(h.id);
    const sumaTipo = (tt: string) => num(r, tt, "Militar") + num(r, tt, "Afiliado") + num(r, tt, "Pna");
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
      pna: tiposIncluidos.reduce((a, tt) => a + num(r, tt, "Pna"), 0),
    };
  });

  const cat = { Militar: 0, Afiliado: 0, PNA: 0 };
  for (const f of centrosFila) {
    cat.Militar += f.militar;
    cat.Afiliado += f.afiliado;
    cat.PNA += f.pna;
  }
  const granTotal = cat.Militar + cat.Afiliado + cat.PNA;

  // Totales por servicio (para las tortas por actividad)
  const porTipo = Object.fromEntries(
    (["consultas", "intervenciones", "hospitalizaciones"] as const).map((tt) => {
      const c = {
        Militar: filas.reduce((a, f) => a + Number(f.r[`${tt}Militar` as keyof typeof f.r]), 0),
        Afiliado: filas.reduce((a, f) => a + Number(f.r[`${tt}Afiliado` as keyof typeof f.r]), 0),
        PNA: filas.reduce((a, f) => a + Number(f.r[`${tt}Pna` as keyof typeof f.r]), 0),
      };
      return [tt, { ...c, total: c.Militar + c.Afiliado + c.PNA }];
    }),
  ) as DatosReporte["porTipo"];

  // Detalle por especialidad × hospital × servicio
  const tiposDetalle = tipo === "todos" ? ["consultas", "intervenciones", "hospitalizaciones"] : [tipo];
  const condicionesC: SQL[] = anio
    ? [gte(consultas.semanaDesde, `${anio}-01-01`), lte(consultas.semanaDesde, `${anio}-12-31`)]
    : mes
      ? [gte(consultas.semanaDesde, `${mes}-01`), lte(consultas.semanaDesde, `${mesHasta}-31`)]
      : [eq(consultas.semanaDesde, semana)];
  if (especialidadId) condicionesC.push(eq(consultas.especialidadId, especialidadId));
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

  // Rango mostrado del periodo: mes → del día 1 al último día del mes (o rango de meses);
  // año → todo el año; semana → lunes a viernes
  const ultimoDia = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).toISOString().slice(0, 10);
  let rangoDesde: string;
  let rangoHasta: string;
  if (anio) {
    rangoDesde = `${anio}-01-01`;
    rangoHasta = `${anio}-12-31`;
  } else if (mes) {
    rangoDesde = `${mes}-01`;
    rangoHasta = ultimoDia(mesHasta ?? mes!);
  } else {
    const semanasOrdenadas = filas.map((f) => f.r.semanaDesde).sort();
    const base = semana || new Date().toISOString().slice(0, 10);
    rangoDesde = semanasOrdenadas[0] ?? base;
    rangoHasta = semanasOrdenadas.length ? viernesDe(semanasOrdenadas[semanasOrdenadas.length - 1]) : viernesDe(base);
  }

  const detalle = [...detalleMap.values()].sort(
    (a, b) => a.hospital.localeCompare(b.hospital) || a.especialidad.localeCompare(b.especialidad),
  );

  // Reporte por especialidad: los totales se recalculan desde el detalle ya filtrado
  let catFinal = cat;
  let porTipoFinal = porTipo;
  let granTotalFinal = granTotal;
  let centrosFinal = centrosFila;
  if (especialidadId) {
    const catEsp = { Militar: 0, Afiliado: 0, PNA: 0 };
    for (const x of detalle) {
      catEsp.Militar += x.Militar;
      catEsp.Afiliado += x.Afiliado;
      catEsp.PNA += x.PNA;
    }
    catFinal = catEsp;
    granTotalFinal = catEsp.Militar + catEsp.Afiliado + catEsp.PNA;
    porTipoFinal = Object.fromEntries(
      (["consultas", "intervenciones", "hospitalizaciones"] as const).map((tt) => {
        const c = { Militar: 0, Afiliado: 0, PNA: 0 };
        for (const x of detalle)
          if (ETIQUETA_TIPO[tt] === x.tipo) {
            c.Militar += x.Militar;
            c.Afiliado += x.Afiliado;
            c.PNA += x.PNA;
          }
        return [tt, { ...c, total: c.Militar + c.Afiliado + c.PNA }];
      }),
    ) as DatosReporte["porTipo"];
    const acum = new Map<number, { consultas: number; intervenciones: number; hospitalizaciones: number; militar: number; afiliado: number; pna: number }>();
    for (const x of detalle) {
      const centro = centros.find((c) => c.nombre === x.hospital);
      const id = centro?.id ?? -1;
      const a =
        acum.get(id) ?? { consultas: 0, intervenciones: 0, hospitalizaciones: 0, militar: 0, afiliado: 0, pna: 0 };
      if (x.tipo === "Consultas") a.consultas += x.Militar + x.Afiliado + x.PNA;
      if (x.tipo === "Intervenciones Qx") a.intervenciones += x.Militar + x.Afiliado + x.PNA;
      if (x.tipo === "Hospitalizaciones") a.hospitalizaciones += x.Militar + x.Afiliado + x.PNA;
      a.militar += x.Militar;
      a.afiliado += x.Afiliado;
      a.pna += x.PNA;
      acum.set(id, a);
    }
    centrosFinal = (hospitalFiltro === "todos" ? centros.filter((c) => c.activo) : centros.filter((c) => String(c.id) === hospitalFiltro)).map(
      (h) => {
        const base = centrosFila.find((f) => f.id === h.id)!;
        const a = acum.get(h.id);
        return a
          ? { ...base, ...a, conDatos: true }
          : { ...base, consultas: 0, intervenciones: 0, hospitalizaciones: 0, militar: 0, afiliado: 0, pna: 0, conDatos: false };
      },
    );
  }

  return {
    semana: rangoDesde,
    semanaHasta: rangoHasta,
    hospitalFiltro,
    tipo,
    nombreHospital,
    tituloTipo: tipo === "todos" ? "ACTIVIDADES" : tipo.toUpperCase(),
    tiposIncluidos,
    centros: centrosFinal,
    cat: catFinal,
    porTipo: porTipoFinal,
    granTotal: granTotalFinal,
    detalle,
  };
}
