import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { obtenerDatosReporte } from "@/lib/reporte-datos";
import VistaReporte from "@/components/VistaReporte";
import BotonImprimir from "./BotonImprimir";

// Vista previa imprimible (→ PDF) con el formato oficial. Filtros: semana,
// hospital (id o "todos"), tipo de servicio. Descarga directa en /descarga.
export default async function ReportePdf({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; mes?: string; hospital?: string; tipo?: string }>;
}) {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") redirect("/consultas");

  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : null;
  const semana = sp.semana ?? "";
  if (!mes && !/^\d{4}-\d{2}-\d{2}$/.test(semana)) {
    return (
      <main className="p-10 text-[14px] text-tinta2">
        Semana o mes inválido. Vuelve al panel y selecciona un periodo.
      </main>
    );
  }
  const hospitalFiltro = sp.hospital ?? "todos";
  const tipo = sp.tipo ?? "todos";
  const d = await obtenerDatosReporte({ semana, mes: mes ?? undefined, hospital: hospitalFiltro, tipo });
  const qs = `&${mes ? `mes=${mes}` : `semana=${semana}`}`;

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-6 pt-4 print:hidden">
        <div className="flex items-center justify-between">
          <a href="/panel" className="text-[13px] font-semibold text-banda hover:underline">
            ← Volver al panel
          </a>
          <div className="flex items-center gap-2">
            <a
              href={`/panel/reporte-pdf/descarga?${qs}&hospital=${encodeURIComponent(hospitalFiltro)}&tipo=${tipo}&disp=inline`}
              target="_blank"
              rel="noopener"
              className="h-9 rounded-chico bg-banda px-4 text-[13px] font-semibold leading-9 text-white hover:bg-[#153a6e]"
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
