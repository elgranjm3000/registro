import { redirect } from "next/navigation";
import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { consultas, especialidades, hospitales, reportes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";
import { viernesDe } from "@/lib/fechas";
import BotonImprimir from "./BotonImprimir";

// Reporte imprimible (→ PDF) con el formato oficial de la Sala Situacional.
// Filtros: semana (lunes), hospital (id o "todos"), tipo de servicio.
export default async function ReportePdf({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; hospital?: string; tipo?: string }>;
}) {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") redirect("/consultas");

  const sp = await searchParams;
  const semana = sp.semana ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) {
    return (
      <main className="p-10 text-[14px] text-tinta2">
        Semana inválida. Vuelve al panel y selecciona una fecha.
      </main>
    );
  }
  const hospitalFiltro = sp.hospital ?? "todos";
  const tipo = sp.tipo ?? "todos";
  const semanaHasta = viernesDe(semana);
  const fmt = (iso: string) => `${iso.slice(8)}${iso.slice(5, 7).replace(/^0/, "")}`;

  const condiciones: SQL[] = [eq(reportes.semanaDesde, semana)];
  const centros = await db.select().from(hospitales).orderBy(hospitales.nombre);
  if (hospitalFiltro !== "todos") condiciones.push(eq(reportes.hospitalId, Number(hospitalFiltro)));
  const filas = await db
    .select({ r: reportes, h: hospitales })
    .from(reportes)
    .innerJoin(hospitales, eq(reportes.hospitalId, hospitales.id))
    .where(and(...condiciones))
    .orderBy(hospitales.nombre);

  const sumaDe = (r: typeof reportes.$inferSelect, t: string) => {
    const tipos =
      tipo === "todos" ? ["consultas", "intervenciones", "hospitalizaciones"] : [tipo];
    return tipos.reduce(
      (a, tt) =>
        a +
        Number(r[`${tt}Militar` as keyof typeof r]) +
        Number(r[`${tt}Afiliado` as keyof typeof r]) +
        Number(r[`${tt}Pna` as keyof typeof r]),
      0,
    );
  };

  // Totales por categoría para la dona
  const tiposIncluidos =
    tipo === "todos" ? ["consultas", "intervenciones", "hospitalizaciones"] : [tipo];
  const cat = { Militar: 0, Afiliado: 0, PNA: 0 };
  for (const f of filas)
    for (const tt of tiposIncluidos) {
      cat.Militar += Number(f.r[`${tt}Militar` as keyof typeof f.r]);
      cat.Afiliado += Number(f.r[`${tt}Afiliado` as keyof typeof f.r]);
      cat.PNA += Number(f.r[`${tt}Pna` as keyof typeof f.r]);
    }
  const granTotal = cat.Militar + cat.Afiliado + cat.PNA;

  // Detalle por especialidad (solo del tipo elegido o de consultas en "todos")
  const tiposConsulta = tipo === "todos" ? ["consultas"] : [tipo];
  const condicionesC: SQL[] = [eq(consultas.semanaDesde, semana)];
  if (hospitalFiltro !== "todos") condicionesC.push(eq(consultas.hospitalId, Number(hospitalFiltro)));
  const filasC = await db
    .select({ c: consultas, e: especialidades })
    .from(consultas)
    .innerJoin(especialidades, eq(consultas.especialidadId, especialidades.id))
    .where(and(...condicionesC));

  const porEsp = new Map<number, { nombre: string; Militar: number; Afiliado: number; PNA: number }>();
  for (const f of filasC) {
    if (!tiposConsulta.includes(f.c.tipo)) continue;
    const acc = porEsp.get(f.e.id) ?? { nombre: f.e.nombre, Militar: 0, Afiliado: 0, PNA: 0 };
    acc.Militar += f.c.militar;
    acc.Afiliado += f.c.afiliado;
    acc.PNA += f.c.pna;
    porEsp.set(f.e.id, acc);
  }
  const espLista = await db
    .select()
    .from(especialidades)
    .where(eq(especialidades.activa, true))
    .orderBy(asc(especialidades.orden), asc(especialidades.nombre));

  const nombreHospital =
    hospitalFiltro === "todos"
      ? "TODOS LOS CENTROS"
      : (centros.find((c) => c.id === Number(hospitalFiltro))?.nombre ?? "").toUpperCase();
  const tituloTipo =
    tipo === "todos" ? "ACTIVIDADES" : tipo.toUpperCase();

  const colCat = { Militar: "#4caf6d", Afiliado: "#2f9ec7", PNA: "#d64541" };

  return (
    <div className="min-h-dvh bg-white print:bg-white">
      <div className="mx-auto max-w-4xl px-6 py-6">
        {/* Controles de impresión (no salen en el PDF) */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <a href="/panel" className="text-[13px] font-semibold text-banda hover:underline">
            ← Volver al panel
          </a>
          <BotonImprimir />
        </div>

        {/* Membrete oficial */}
        <div className="grid grid-cols-3 items-center border-b-2 border-banda pb-3 text-center">
          <div className="text-[11px] font-bold leading-tight text-banda">
            REPÚBLICA BOLIVARIANA
            <br />
            DE VENEZUELA
          </div>
          <div className="text-[11px] font-bold leading-tight text-banda">
            MINISTERIO DEL PODER POPULAR
            <br />
            PARA LA DEFENSA
          </div>
          <div className="text-[13px] font-bold text-banda">DIGESALUD</div>
        </div>
        <div className="mt-2 text-[10px] font-medium text-tinta3">
          FUENTE: SALA SITUACIONAL / DIGESALUD · {nombreHospital}
        </div>

        {/* Banda de título */}
        <div className="mt-4 bg-[#dce7f5] px-4 py-3 text-center">
          <div className="text-[15px] font-bold uppercase tracking-wide text-tinta">
            Distribución de {tituloTipo} en la Red de Salud Militar
          </div>
          <div className="mt-0.5 text-[13px] font-bold uppercase tracking-wide text-fecha">
            Desde el {fmt(semana)} hasta el {fmt(semanaHasta)}
          </div>
        </div>

        {/* Dona + cuadro de total */}
        <div className="mt-6 grid grid-cols-[300px_1fr] items-center gap-8 border border-banda/40 p-6">
          <Dona cat={cat} total={granTotal} colores={colCat} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[240px] bg-[#dce7f5] px-6 py-4 text-center ring-1 ring-banda/40">
              <div className="text-[12px] font-bold uppercase tracking-wide text-banda">
                Total de {tituloTipo.toLowerCase()}
              </div>
              <div className="mt-1 text-[40px] font-bold leading-none text-tinta">{granTotal}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              {(["Militar", "Afiliado", "PNA"] as const).map((k) => (
                <div key={k} className="flex items-center gap-2 text-[12px] font-semibold">
                  <span
                    className="inline-block h-3 w-3 rounded-[2px]"
                    style={{ background: colCat[k] }}
                  />
                  <span className="w-16">{k}</span>
                  <span className="tabular-nums">{cat[k]}</span>
                  <span className="text-tinta3">
                    ({granTotal ? Math.round((cat[k] / granTotal) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla por centro */}
        <h3 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-tinta">
          {hospitalFiltro === "todos" ? "Resumen por centro de salud" : nombreHospital}
        </h3>
        <table className="mt-2 w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">Nº</th>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">CENTRO DE SALUD</th>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">MILITAR</th>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">AFILIADO</th>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">PNA</th>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const m = tiposIncluidos.reduce((a, tt) => a + Number(f.r[`${tt}Militar` as keyof typeof f.r]), 0);
              const a = tiposIncluidos.reduce((a, tt) => a + Number(f.r[`${tt}Afiliado` as keyof typeof f.r]), 0);
              const p = tiposIncluidos.reduce((a, tt) => a + Number(f.r[`${tt}Pna` as keyof typeof f.r]), 0);
              return (
                <tr key={f.r.id}>
                  <td className="border border-tinta/60 px-2 py-1 text-center">{i + 1}</td>
                  <td className="border border-tinta/60 px-2 py-1">{f.h.nombre}, {f.h.ubicacion}</td>
                  <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{String(m).padStart(2, "0")}</td>
                  <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{String(a).padStart(2, "0")}</td>
                  <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{String(p).padStart(2, "0")}</td>
                  <td className="border border-tinta/60 px-2 py-1 text-right font-bold tabular-nums">{m + a + p}</td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="border border-tinta/60 px-2 py-3 text-center text-tinta3">
                  Sin datos cargados para esta selección.
                </td>
              </tr>
            )}
            {filas.length > 0 && (
              <tr className="bg-[#dce7f5] font-bold">
                <td className="border border-tinta/60 px-2 py-1.5 text-center" colSpan={2}>
                  TOTAL
                </td>
                <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{cat.Militar}</td>
                <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{cat.Afiliado}</td>
                <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{cat.PNA}</td>
                <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{granTotal}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Detalle por especialidad */}
        {espLista.length > 0 && (
          <>
            <h3 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-tinta">
              Detalle por especialidad ({tiposConsulta[0] === "consultas" ? "consultas" : tituloTipo.toLowerCase()})
            </h3>
            <table className="mt-2 w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">Nº</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">ESPECIALIDAD</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">MILITAR</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">AFILIADO</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">PNA</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {espLista.map((e, i) => {
                  const d = porEsp.get(e.id) ?? { nombre: e.nombre, Militar: 0, Afiliado: 0, PNA: 0 };
                  if (d.Militar + d.Afiliado + d.PNA === 0) return null;
                  return (
                    <tr key={e.id}>
                      <td className="border border-tinta/60 px-2 py-1 text-center">{i + 1}</td>
                      <td className="border border-tinta/60 px-2 py-1">{d.nombre}</td>
                      <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{String(d.Militar).padStart(2, "0")}</td>
                      <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{String(d.Afiliado).padStart(2, "0")}</td>
                      <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{String(d.PNA).padStart(2, "0")}</td>
                      <td className="border border-tinta/60 px-2 py-1 text-right font-bold tabular-nums">
                        {d.Militar + d.Afiliado + d.PNA}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#dce7f5] font-bold">
                  <td className="border border-tinta/60 px-2 py-1.5 text-center" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
                    {[...porEsp.values()].reduce((a, d) => a + d.Militar, 0)}
                  </td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
                    {[...porEsp.values()].reduce((a, d) => a + d.Afiliado, 0)}
                  </td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
                    {[...porEsp.values()].reduce((a, d) => a + d.PNA, 0)}
                  </td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
                    {[...porEsp.values()].reduce((a, d) => a + d.Militar + d.Afiliado + d.PNA, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

// Dona SVG con los tres colores fijos del formato oficial
function Dona({
  cat,
  total,
  colores,
}: {
  cat: { Militar: number; Afiliado: number; PNA: number };
  total: number;
  colores: { Militar: string; Afiliado: string; PNA: string };
}) {
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segmentos = (["Militar", "Afiliado", "PNA"] as const).map((k) => {
    const frac = total ? cat[k] / total : 0;
    const seg = { k, color: colores[k], dash: frac * C, offset };
    offset += frac * C;
    return seg;
  });

  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-56 w-56">
      <circle cx="100" cy="100" r={R} fill="none" stroke="#eef1f5" strokeWidth="34" />
      {total > 0 &&
        segmentos
          .filter((s) => s.dash > 0)
          .map((s) => (
            <circle
              key={s.k}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="34"
              strokeDasharray={`${s.dash} ${C - s.dash}`}
              strokeDashoffset={-s.offset}
              transform="rotate(-90 100 100)"
            />
          ))}
      <text x="100" y="96" textAnchor="middle" className="fill-[#16233b] text-[22px] font-bold">
        {total}
      </text>
      <text x="100" y="114" textAnchor="middle" className="fill-[#8593a8] text-[9px] font-semibold tracking-wider">
        TOTAL
      </text>
    </svg>
  );
}
