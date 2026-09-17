import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { obtenerDatosReporte } from "@/lib/reporte-datos";
import VistaReporte from "@/components/VistaReporte";
import BotonImprimir from "@/app/panel/reporte-pdf/BotonImprimir";

// Reporte imprimible (→ PDF) del propio centro, para chequear su información
export default async function ImpresionCentro({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; tipo?: string }>;
}) {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "centro" || !sesion.hospitalId) redirect("/panel");

  const sp = await searchParams;
  const semana = sp.semana ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) {
    return (
      <main className="p-10 text-[14px] text-tinta2">
        Semana inválida. Vuelve a “Cargar cifras” y usa el botón de reporte.
      </main>
    );
  }
  const tipo = sp.tipo ?? "todos";
  const d = await obtenerDatosReporte({ semana, hospital: String(sesion.hospitalId), tipo });

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-6 pt-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a href="/reportar" className="text-[13px] font-semibold text-banda hover:underline">
            ← Volver a mis reportes
          </a>
          <div className="flex items-center gap-2 text-[13px]">
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
                href={`/reportar/impresion?semana=${semana}&tipo=${v}`}
                className={`rounded-chico px-3 py-1.5 font-semibold ${
                  tipo === v ? "bg-banda text-white" : "border border-borde text-tinta2 hover:bg-papel"
                }`}
              >
                {et}
              </a>
            ))}
            <BotonImprimir />
          </div>
        </div>
      </div>
      <VistaReporte d={d} />
    </div>
  );
}
