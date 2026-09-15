import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { consultas, especialidades, hospitales, reportes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";
import { lunesActual } from "@/lib/fechas";
import Encabezado from "@/components/Encabezado";
import FormularioCifras from "./Formulario";

export default async function PaginaConsultas() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "centro" || !sesion.hospitalId) redirect("/panel");

  const [hospital] = await db.select().from(hospitales).where(eq(hospitales.id, sesion.hospitalId));
  const esp = await db
    .select()
    .from(especialidades)
    .where(eq(especialidades.activa, true))
    .orderBy(asc(especialidades.orden), asc(especialidades.nombre));

  // Cifras ya cargadas de las últimas 8 semanas (para precargar el formulario)
  const lunes = lunesActual();
  const desde8 = new Date(lunes + "T12:00:00");
  desde8.setDate(desde8.getDate() - 7 * 7);
  const mias = await db
    .select()
    .from(consultas)
    .where(eq(consultas.hospitalId, sesion.hospitalId))
    .orderBy(desc(consultas.semanaDesde))
    .limit(500);
  const cifras = mias.filter((c) => c.semanaDesde >= desde8.toISOString().slice(0, 10));

  const historial = await db
    .select()
    .from(reportes)
    .where(eq(reportes.hospitalId, sesion.hospitalId))
    .orderBy(desc(reportes.semanaDesde))
    .limit(8);

  return (
    <div className="min-h-dvh">
      <Encabezado subtitulo="Carga semanal de cifras" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold leading-tight">{hospital?.nombre}</h1>
            <p className="mt-1 text-[13px] font-medium text-tinta2">
              {hospital?.ubicacion} · Consultas por especialidad + intervenciones y hospitalizaciones
            </p>
          </div>
          <a href="/reportar" className="text-[13px] font-semibold text-banda hover:underline">
            Ver reporte semanal →
          </a>
        </div>
        <FormularioCifras especialidades={esp} cifras={cifras} historial={historial} />
      </main>
    </div>
  );
}
