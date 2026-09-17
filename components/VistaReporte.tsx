import type { DatosReporte } from "@/lib/reporte-datos";
import { formatoMilitar } from "@/lib/fechas";

const COL = { Militar: "#4caf6d", Afiliado: "#2f9ec7", PNA: "#d64541" };

// Formato numérico del formato oficial: 25.602
const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Vista del reporte con formato oficial (usada por el admin y por cada centro).
// No incluye controles de navegación: esos los pone cada página.
export default function VistaReporte({ d }: { d: DatosReporte }) {
  const porTipo = d.tipo === "todos";

  return (
    <div className="bg-white print:bg-white">
      <div className="mx-auto max-w-4xl px-6 py-6">
        {/* Membrete oficial */}
        <div className="flex items-center gap-3 border-b-2 border-banda pb-3 text-center">
          <div className="flex-1 text-[12px] font-bold leading-tight text-banda">
            REPÚBLICA BOLIVARIANA
            <br />
            DE VENEZUELA
          </div>
          <div className="h-10 w-px bg-banda/40" />
          <div className="flex-1 text-[12px] font-bold leading-tight text-banda">
            MINISTERIO DEL PODER POPULAR
            <br />
            PARA LA DEFENSA
          </div>
          <div className="h-10 w-px bg-banda/40" />
          <div className="flex flex-1 items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/digesalud.png" alt="Sello DIGESALUD" className="h-9 w-auto" />
            <div className="text-[14px] font-bold text-banda">DIGESALUD</div>
          </div>
        </div>
        <div className="mt-2 text-[10px] font-medium text-tinta3">
          FUENTE: SALA SITUACIONAL / DIGESALUD · {d.nombreHospital}
        </div>

        {/* Banda de título */}
        <div className="mt-4 bg-[#dce7f5] px-4 py-3 text-center">
          <div className="text-[15px] font-bold uppercase tracking-wide text-tinta">
            Distribución de {d.tituloTipo} en la Red de Salud Militar
          </div>
          <div className="mt-0.5 text-[13px] font-bold uppercase tracking-wide text-fecha">
            Desde el {formatoMilitar(d.semana)} hasta el {formatoMilitar(d.semanaHasta)}
          </div>
        </div>

        {/* Torta por actividad cuando el reporte abarca los tres servicios */}
        {porTipo ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {(
              [
                ["consultas", "Consultas"],
                ["intervenciones", "Intervenciones Quirúrgicas"],
                ["hospitalizaciones", "Hospitalizaciones"],
              ] as const
            ).map(([clave, titulo]) => (
              <PanelActividad key={clave} titulo={titulo} cat={d.porTipo[clave]} />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-[300px_1fr] items-center gap-8 border border-banda/40 p-6">
            <Dona cat={d.cat} total={d.granTotal} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-w-[240px] bg-[#dce7f5] px-6 py-4 text-center ring-1 ring-banda/40">
                <div className="text-[12px] font-bold uppercase tracking-wide text-banda">
                  Total de {d.tituloTipo.toLowerCase()}
                </div>
                <div className="mt-1 text-[40px] font-bold leading-none text-tinta">{fmt(d.granTotal)}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                {(["Militar", "Afiliado", "PNA"] as const).map((k) => (
                  <div key={k} className="flex items-center gap-2 text-[12px] font-semibold">
                    <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COL[k] }} />
                    <span className="w-16">{k}</span>
                    <span className="tabular-nums">{fmt(d.cat[k])}</span>
                    <span className="text-tinta3">
                      ({d.granTotal ? Math.round((d.cat[k] / d.granTotal) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resumen por centro */}
        <h3 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-tinta">
          {d.hospitalFiltro === "todos" ? "Resumen por centro de salud" : d.nombreHospital}
        </h3>
        <table className="mt-2 w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">Nº</th>
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">CENTRO DE SALUD</th>
              {porTipo ? (
                <>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">CONSULTAS</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">INTERVENCIONES QX</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">HOSPITALIZACIONES</th>
                </>
              ) : (
                <>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">MILITAR</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">AFILIADO</th>
                  <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">PNA</th>
                </>
              )}
              <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {d.centros.map((f, i) => (
              <tr key={f.id}>
                <td className="border border-tinta/60 px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-tinta/60 px-2 py-1">
                  {f.nombre}, {f.ubicacion}
                </td>
                {porTipo ? (
                  <>
                    <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(f.consultas)}</td>
                    <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(f.intervenciones)}</td>
                    <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(f.hospitalizaciones)}</td>
                  </>
                ) : (
                  <>
                    <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(f.militar)}</td>
                    <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(f.afiliado)}</td>
                    <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(f.pna)}</td>
                  </>
                )}
                <td className="border border-tinta/60 px-2 py-1 text-right font-bold tabular-nums">
                  {fmt(f.consultas + f.intervenciones + f.hospitalizaciones)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#dce7f5] font-bold">
              <td className="border border-tinta/60 px-2 py-1.5 text-center" colSpan={2}>
                TOTAL
              </td>
              {porTipo ? (
                <>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
                    {d.centros.reduce((a, f) => a + f.consultas, 0)}
                  </td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
                    {d.centros.reduce((a, f) => a + f.intervenciones, 0)}
                  </td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
                    {d.centros.reduce((a, f) => a + f.hospitalizaciones, 0)}
                  </td>
                </>
              ) : (
                <>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{d.cat.Militar}</td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{d.cat.Afiliado}</td>
                  <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{d.cat.PNA}</td>
                </>
              )}
              <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">{d.granTotal}</td>
            </tr>
          </tbody>
        </table>

        {/* Detalle por especialidad: una tabla por actividad */}
        {porTipo ? (
          ACTIVIDADES.map(([clave, titulo]) => (
            <div key={clave}>
              <h3 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-fecha">{titulo}</h3>
              <TablaDetalle filas={d.detalle.filter((x) => x.tipo === titulo)} conCentro={d.hospitalFiltro === "todos"} />
            </div>
          ))
        ) : (
          <>
            <h3 className="mt-8 text-[13px] font-bold uppercase tracking-wide text-tinta">
              Detalle por especialidad ({d.tituloTipo.toLowerCase()})
            </h3>
            <TablaDetalle filas={d.detalle} conCentro={d.hospitalFiltro === "todos"} />
          </>
        )}
      </div>
    </div>
  );
}

const ACTIVIDADES = [
  ["Consultas", "Consultas"],
  ["intervenciones", "Intervenciones Qx"],
  ["hospitalizaciones", "Hospitalizaciones"],
] as const;

type FilaDetalle = DatosReporte["detalle"][number];

function TablaDetalle({ filas, conCentro }: { filas: FilaDetalle[]; conCentro: boolean }) {
  return (
    <table className="mt-2 w-full border-collapse text-[11px]">
      <thead>
        <tr>
          <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">Nº</th>
          {conCentro && <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">CENTRO</th>}
          <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-left">ESPECIALIDAD</th>
          <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">MILITAR</th>
          <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">AFILIADO</th>
          <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">PNA</th>
          <th className="border border-tinta/60 bg-[#dce7f5] px-2 py-1.5 text-right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {filas.length === 0 && (
          <tr>
            <td colSpan={conCentro ? 7 : 6} className="border border-tinta/60 px-2 py-3 text-center text-tinta3">
              Sin detalle cargado para esta actividad.
            </td>
          </tr>
        )}
        {filas.map((x, i) => (
          <tr key={i}>
            <td className="border border-tinta/60 px-2 py-1 text-center">{i + 1}</td>
            {conCentro && <td className="border border-tinta/60 px-2 py-1">{x.hospital}</td>}
            <td className="border border-tinta/60 px-2 py-1">{x.especialidad}</td>
            <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(x.Militar)}</td>
            <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(x.Afiliado)}</td>
            <td className="border border-tinta/60 px-2 py-1 text-right tabular-nums">{fmt(x.PNA)}</td>
            <td className="border border-tinta/60 px-2 py-1 text-right font-bold tabular-nums">
              {fmt(x.Militar + x.Afiliado + x.PNA)}
            </td>
          </tr>
        ))}
        <tr className="bg-[#dce7f5] font-bold">
          <td className="border border-tinta/60 px-2 py-1.5 text-center" colSpan={2 + (conCentro ? 1 : 0)}>
            TOTAL
          </td>
          <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
            {fmt(filas.reduce((a, x) => a + x.Militar, 0))}
          </td>
          <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
            {fmt(filas.reduce((a, x) => a + x.Afiliado, 0))}
          </td>
          <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
            {fmt(filas.reduce((a, x) => a + x.PNA, 0))}
          </td>
          <td className="border border-tinta/60 px-2 py-1.5 text-right tabular-nums">
            {fmt(filas.reduce((a, x) => a + x.Militar + x.Afiliado + x.PNA, 0))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// Dona SVG con los tres colores fijos del formato oficial
function Dona({
  cat,
  total,
  titulo,
}: {
  cat: DatosReporte["cat"] | DatosReporte["porTipo"]["consultas"];
  total: number;
  titulo?: string;
}) {
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segmentos = (["Militar", "Afiliado", "PNA"] as const).map((k) => {
    const frac = total ? cat[k] / total : 0;
    const seg = { k, color: COL[k], dash: frac * C, offset, frac };
    offset += frac * C;
    return seg;
  });

  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-52 w-52">
      <circle cx="100" cy="100" r={R} fill="none" stroke="#eef1f5" strokeWidth="34" />
      {total > 0 &&
        segmentos
          .filter((s) => s.dash > 0)
          .map((s) => (
            <g key={s.k}>
              <circle
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
              {s.frac >= 0.12 && (
                <text
                  x={100 + 70 * Math.cos((-90 + (s.offset + s.dash / 2) * (360 / C)) * (Math.PI / 180))}
                  y={100 + 70 * Math.sin((-90 + (s.offset + s.dash / 2) * (360 / C)) * (Math.PI / 180)) + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-[13px] font-bold"
                >
                  {Math.round(s.frac * 100)}%
                </text>
              )}
            </g>
          ))}
      {titulo && (
        <text x="100" y="88" textAnchor="middle" className="fill-[#8593a8] text-[10px] font-semibold tracking-wider">
          TOTAL
        </text>
      )}
      <text x="100" y="106" textAnchor="middle" className="fill-[#16233b] text-[24px] font-bold">
        {fmt(total)}
      </text>
      {titulo && (
        <text x="100" y="122" textAnchor="middle" className="fill-[#8593a8] text-[9px] font-semibold uppercase tracking-wider">
          {titulo}
        </text>
      )}
    </svg>
  );
}

// Panel por actividad: torta + leyenda + cuadro de total
function PanelActividad({
  titulo,
  cat,
}: {
  titulo: string;
  cat: DatosReporte["porTipo"]["consultas"];
}) {
  return (
    <div className="border border-banda/40 p-4 text-center">
      <div className="text-[12px] font-bold uppercase tracking-wide text-fecha">{titulo}</div>
      <Dona cat={cat} total={cat.total} titulo={titulo} />
      <div className="flex flex-col items-center gap-1">
        {(["Militar", "Afiliado", "PNA"] as const).map((k) => (
          <div key={k} className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: COL[k] }} />
            <span className="w-14 text-left">{k}</span>
            <span className="tabular-nums">{fmt(cat[k])}</span>
            <span className="text-tinta3">
              ({cat.total ? Math.round((cat[k] / cat.total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-[#dce7f5] px-4 py-2 ring-1 ring-banda/40">
        <div className="text-[10px] font-bold uppercase tracking-wide text-banda">Total {titulo.toLowerCase()}</div>
        <div className="text-[24px] font-bold leading-tight text-tinta tabular-nums">{fmt(cat.total)}</div>
      </div>
    </div>
  );
}
