import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { obtenerDatosReporte } from "@/lib/reporte-datos";
import VistaReporte from "@/components/VistaReporte";
import BotonImprimir from "@/app/panel/reporte-pdf/BotonImprimir";

// Reporte imprimible (→ PDF) del propio centro, para chequear su información
export default async function ImpresionCentro({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; mes?: string; tipo?: string }>;
}) {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "centro" || !sesion.hospitalId) redirect("/panel");

  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : null;
  const semana = sp.semana ?? "";
  if (!mes && !/^\d{4}-\d{2}-\d{2}$/.test(semana)) {
    return (
      <main className="p-10 text-[14px] text-tinta2">
        Semana o mes inválido. Vuelve a “Cargar cifras” y usa el botón de reporte.
      </main>
    );
  }
  const tipo = sp.tipo ?? "todos";
  const d = await obtenerDatosReporte({ semana, mes: mes ?? undefined, hospital: String(sesion.hospitalId), tipo });
  const periodo = mes ? `mes=${mes}` : `semana=${semana}`;

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-6 pt-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a href="/reportar" className="text-[13px] font-semibold text-banda hover:underline">
            ← Volver a mis reportes
          </a>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {/* Cambiar entre semana y mes */}
            <form method="get" className="flex items-center gap-1.5">
              {tipo !== "todos" && <input type="hidden" name="tipo" value={tipo} />}
              <input
                type={mes ? "month" : "date"}
                name={mes ? "mes" : "semana"}
                defaultValue={mes ?? semana}
                className="h-9"
              />
              <button className="h-9 rounded-chico border border-borde px-3 font-semibold text-tinta2 hover:bg-papel">
                Cambiar
              </button>
            </form>
            {(
              [
                ["todos", "Todos"],
                ["consultas", "Consultas"],
                ["intervenciones", "Intervenciones Qx"],
                ["hospitalizaciones", "Hospitalizaciones"],
              ] as const
            ).map(([v, et]) => (
              <a
                key={v}
                href={`/reportar/impresion?${periodo}&tipo=${v}`}
                className={`rounded-chico px-3 py-1.5 font-semibold ${
                  tipo === v ? "bg-banda text-white" : "border border-borde text-tinta2 hover:bg-papel"
                }`}
              >
                {et}
              </a>
            ))}
            <a
              href={`/reportar/impresion/descarga?${periodo}&tipo=${tipo}&disp=inline`}
              target="_blank"
              rel="noopener"
              className="rounded-chico bg-banda px-3 py-1.5 font-semibold text-white hover:bg-[#153a6e]"
            >
              ⤓ Descargar PDF
            </a>
            <BotonImprimir />
          </div>
        </div>
      </div>
      <VistaReporte d={d} />
    </div>
  );
}
