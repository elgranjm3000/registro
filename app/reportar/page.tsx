import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hospitales, reportes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";
import Encabezado from "@/components/Encabezado";
import FormularioReporte from "./Formulario";

// Vista de solo lectura: el reporte se genera automáticamente al guardar cifras en /consultas
export default async function Reportar() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "centro" || !sesion.hospitalId) redirect("/panel");

  const [hospital] = await db.select().from(hospitales).where(eq(hospitales.id, sesion.hospitalId));
  const historial = await db
    .select()
    .from(reportes)
    .where(eq(reportes.hospitalId, sesion.hospitalId))
    .orderBy(desc(reportes.semanaDesde))
    .limit(8);

  return (
    <div className="min-h-dvh">
      <Encabezado subtitulo="Reporte semanal" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold leading-tight">{hospital?.nombre}</h1>
            <p className="mt-1 text-[13px] font-medium text-tinta2">
              {hospital?.ubicacion} · Reporte de lunes a viernes de cada semana
            </p>
          </div>
          <a href="/consultas" className="text-[13px] font-semibold text-banda hover:underline">
            Cargar cifras de la semana →
          </a>
        </div>
        <FormularioReporte historial={historial} />
      </main>
    </div>
  );
}
