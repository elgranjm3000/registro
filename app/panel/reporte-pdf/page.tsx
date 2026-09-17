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
  const d = await obtenerDatosReporte({ semana, hospital: hospitalFiltro, tipo });

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-6 pt-4 print:hidden">
        <div className="flex items-center justify-between">
          <a href="/panel" className="text-[13px] font-semibold text-banda hover:underline">
            ← Volver al panel
          </a>
          <div className="flex items-center gap-2">
            <a
              href={`/panel/reporte-pdf/descarga?semana=${semana}&hospital=${encodeURIComponent(hospitalFiltro)}&tipo=${tipo}`}
              className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold leading-9 text-banda hover:bg-papel"
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
