import { NextResponse } from "next/server";
import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { consultas, especialidades, hospitales, reportes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";

// Exporta el reporte semanal en Excel, replicando el formato oficial:
// banda de título + línea roja de fechas + tabla por centro + fila TOTAL.
export async function GET(req: Request) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const semanaDesde = url.searchParams.get("semana") ?? "";
  const estadoFiltro = url.searchParams.get("estado") ?? "todos"; // todos|verificado|pendiente|rechazado
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semanaDesde))
    return NextResponse.json({ error: "Semana inválida" }, { status: 400 });

  const d = new Date(semanaDesde + "T12:00:00");
  d.setDate(d.getDate() + 4);
  const semanaHasta = d.toISOString().slice(0, 10);

  const condiciones: SQL[] = [eq(reportes.semanaDesde, semanaDesde)];
  if (estadoFiltro !== "todos")
    condiciones.push(eq(reportes.estado, estadoFiltro as "verificado" | "pendiente" | "rechazado"));
  const filas = await db
    .select({ r: reportes, h: hospitales })
    .from(reportes)
    .innerJoin(hospitales, eq(reportes.hospitalId, hospitales.id))
    .where(and(...condiciones))
    .orderBy(hospitales.nombre);

  const fmt = (iso: string) => iso.slice(8, 10) + iso.slice(5, 7).replace(/^0/, "") + "26";
  const celda = (
    nombre: string,
    ubicacion: string,
    r: typeof reportes.$inferSelect,
    i: number,
  ) => {
    const t = (k: string) =>
      Number(r[`${k}Militar` as keyof typeof r]) +
      Number(r[`${k}Afiliado` as keyof typeof r]) +
      Number(r[`${k}Pna` as keyof typeof r]);
    return {
      "Nº": i + 1,
      "CENTROS DE SALUD": `${nombre}, ${ubicacion}`,
      "CONSULTAS MILITAR": r.consultasMilitar,
      "CONSULTAS AFILIADO": r.consultasAfiliado,
      "CONSULTAS PNA": r.consultasPna,
      "TOTAL CONSULTAS": t("consultas"),
      "INTERVENCIONES MILITAR": r.intervencionesMilitar,
      "INTERVENCIONES AFILIADO": r.intervencionesAfiliado,
      "INTERVENCIONES PNA": r.intervencionesPna,
      "TOTAL INTERVENCIONES": t("intervenciones"),
      "HOSPITALIZACIONES MILITAR": r.hospitalizacionesMilitar,
      "HOSPITALIZACIONES AFILIADO": r.hospitalizacionesAfiliado,
      "HOSPITALIZACIONES PNA": r.hospitalizacionesPna,
      "TOTAL HOSPITALIZACIONES": t("hospitalizaciones"),
      "TOTAL GENERAL": t("consultas") + t("intervenciones") + t("hospitalizaciones"),
      ESTADO: r.estado.toUpperCase(),
    };
  };

  const XLSX = await import("xlsx");
  const hoja = XLSX.utils.json_to_sheet([
    ["REPÚBLICA BOLIVARIANA DE VENEZUELA — MINISTERIO DEL PODER POPULAR PARA LA DEFENSA — DIGESALUD"],
    ["REPORTE SEMANAL DE ACTIVIDADES EN LA RED DE SALUD MILITAR"],
    [`DESDE EL ${fmt(semanaDesde)} HASTA EL ${fmt(semanaHasta)}`],
    [`FILTRO DE ESTADO: ${estadoFiltro.toUpperCase()} · ${filas.length} CENTRO(S)`],
    [],
    ...filas.map((f, i) => celda(f.h.nombre, f.h.ubicacion, f.r, i)),
  ]);

  if (filas.length > 0) {
    const suma = (k: string) =>
      filas.reduce((a, f) => a + Number(f.r[k as keyof typeof f.r] ?? 0), 0);
    const t = (k: string) => suma(`${k}Militar`) + suma(`${k}Afiliado`) + suma(`${k}Pna`);
    const totalFila = [
      "",
      "TOTAL",
      suma("consultasMilitar"), suma("consultasAfiliado"), suma("consultasPna"), t("consultas"),
      suma("intervencionesMilitar"), suma("intervencionesAfiliado"), suma("intervencionesPna"), t("intervenciones"),
      suma("hospitalizacionesMilitar"), suma("hospitalizacionesAfiliado"), suma("hospitalizacionesPna"), t("hospitalizaciones"),
      t("consultas") + t("intervenciones") + t("hospitalizaciones"),
      "",
    ];
    XLSX.utils.sheet_add_aoa(hoja, [totalFila], { origin: -1 });
  }

  hoja["!cols"] = [{ wch: 4 }, { wch: 62 }, ...Array(13).fill({ wch: 12 }), { wch: 18 }, { wch: 12 }];

  // Hoja 2: consultas por especialidad (todas las especialidades, con total)
  const hospitalesIds =
    estadoFiltro === "todos"
      ? null
      : (await db.select({ id: reportes.hospitalId }).from(reportes).where(and(...condiciones))).map((r) => r.id);

  const condicionesC: SQL[] = [
    eq(consultas.semanaDesde, semanaDesde),
    eq(consultas.tipo, "consultas"),
  ];
  if (hospitalesIds) {
    if (hospitalesIds.length === 0) hospitalesIds.push(-1);
    condicionesC.push(inArray(consultas.hospitalId, hospitalesIds));
  }
  const filasC = await db
    .select({ c: consultas, e: especialidades })
    .from(consultas)
    .innerJoin(especialidades, eq(consultas.especialidadId, especialidades.id))
    .where(and(...condicionesC));

  const porEsp = new Map<number, { nombre: string; m: number; a: number; p: number }>();
  for (const f of filasC) {
    const acc = porEsp.get(f.e.id) ?? { nombre: f.e.nombre, m: 0, a: 0, p: 0 };
    acc.m += f.c.militar;
    acc.a += f.c.afiliado;
    acc.p += f.c.pna;
    porEsp.set(f.e.id, acc);
  }
  const espTodas = await db
    .select()
    .from(especialidades)
    .where(eq(especialidades.activa, true))
    .orderBy(asc(especialidades.orden), asc(especialidades.nombre));

  const hojaEsp = XLSX.utils.json_to_sheet([
    [`CONSULTAS POR ESPECIALIDAD — SEMANA DEL ${fmt(semanaDesde)} AL ${fmt(semanaHasta)}`],
    [],
    ...espTodas.map((e, i) => {
      const d = porEsp.get(e.id) ?? { nombre: e.nombre, m: 0, a: 0, p: 0 };
      return {
        "Nº": i + 1,
        ESPECIALIDAD: d.nombre,
        MILITAR: d.m,
        AFILIADO: d.a,
        PNA: d.p,
        TOTAL: d.m + d.a + d.p,
      };
    }),
    [
      "",
      "TOTAL",
      ...porEsp.size
        ? [
            [...porEsp.values()].reduce((s, d) => s + d.m, 0),
            [...porEsp.values()].reduce((s, d) => s + d.a, 0),
            [...porEsp.values()].reduce((s, d) => s + d.p, 0),
            [...porEsp.values()].reduce((s, d) => s + d.m + d.a + d.p, 0),
          ]
        : [0, 0, 0, 0],
    ],
  ]);
  hojaEsp["!cols"] = [{ wch: 4 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Reporte semanal");
  XLSX.utils.book_append_sheet(libro, hojaEsp, "Consultas por especialidad");
  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-semanal-${semanaDesde}.xlsx"`,
    },
  });
}
