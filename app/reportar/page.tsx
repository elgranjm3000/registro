import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportes, hospitales, pacientes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";
import Encabezado from "@/components/Encabezado";
import FormularioReporte from "./Formulario";

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
  const atenciones = await db
    .select()
    .from(pacientes)
    .where(eq(pacientes.hospitalId, sesion.hospitalId))
    .orderBy(desc(pacientes.fecha))
    .limit(1000);

  return (
    <div className="min-h-dvh">
      <Encabezado subtitulo="Carga semanal de actividades" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold leading-tight">{hospital?.nombre}</h1>
            <p className="mt-1 text-[13px] font-medium text-tinta2">
              {hospital?.ubicacion} · Reporta de lunes a viernes de cada semana
            </p>
          </div>
          <a href="/pacientes" className="text-[13px] font-semibold text-banda hover:underline">
            Registrar pacientes →
          </a>
        </div>
        <FormularioReporte historial={historial} atenciones={atenciones} />
      </main>
    </div>
  );
}
