import { redirect } from "next/navigation";
import { desc, eq, gte, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { bitacora, hospitales, reportes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";
import { accionRevisarReporte } from "@/lib/actions";
import Encabezado from "@/components/Encabezado";
import Graficos from "./Graficos";
import ImportarPacientesAdmin from "./ImportarPacientes";

const lunes = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

export default async function Panel() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") redirect("/reportar");

  const semana = lunes();
  const centros = await db.select().from(hospitales).orderBy(hospitales.nombre);
  const deLaSemana = await db
    .select()
    .from(reportes)
    .where(gte(reportes.semanaDesde, semana));

  // Últimos 8 lunes para la tendencia
  const ochoSemanas = [...Array(8)].map((_, i) => {
    const d = new Date(semana + "T12:00:00");
    d.setDate(d.getDate() - 7 * i);
    return d.toISOString().slice(0, 10);
  });
  const historicos = await db
    .select()
    .from(reportes)
    .where(and(gte(reportes.semanaDesde, ochoSemanas[7]), eq(reportes.estado, "verificado")));

  const ingresos = await db
    .select()
    .from(bitacora)
    .orderBy(desc(bitacora.fecha))
    .limit(12);

  const reportados = new Map(deLaSemana.map((r) => [r.hospitalId, r]));
  const pendientes = deLaSemana.filter((r) => r.estado === "pendiente");
  const faltantes = centros.filter((c) => !reportados.has(c.id));

  const suma = (k: keyof typeof reportes.$inferSelect) =>
    deLaSemana
      .filter((r) => r.estado !== "rechazado")
      .reduce((a, r) => a + (r[k] as number), 0);

  const totalSemana =
    suma("consultasMilitar") + suma("consultasAfiliado") + suma("consultasPna") +
    suma("intervencionesMilitar") + suma("intervencionesAfiliado") + suma("intervencionesPna") +
    suma("hospitalizacionesMilitar") + suma("hospitalizacionesAfiliado") + suma("hospitalizacionesPna");

  const porcentaje = centros.length
    ? Math.round(((centros.length - faltantes.length) / centros.length) * 100)
    : 0;

  return (
    <div className="min-h-dvh">
      <Encabezado subtitulo="Consolidado de la Red de Salud Militar" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Foco de la vista: avance de reporte de la semana */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-tinta3">
              Semana del {semana.split("-").reverse().join("")}
            </div>
            <h1 className="mt-1 text-[28px] font-bold leading-tight">
              {centros.length - faltantes.length}
              <span className="text-tinta3"> / {centros.length} centros han reportado</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-6">
            <Metrica etiqueta="Pendientes de verificar" valor={pendientes.length} />
            <Metrica etiqueta="Sin reportar" valor={faltantes.length} destaque={faltantes.length > 0} />
            <Metrica etiqueta="Actividades totales" valor={totalSemana} />
          </div>
        </div>

        <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-control">
          <div
            className="h-full rounded-full bg-banda transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        <Graficos historicos={historicos} deLaSemana={[...deLaSemana]} />

        <ImportarPacientesAdmin />

        {/* Verificación de cargas */}
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-tinta2">
              Reportes de esta semana
            </h2>
            {/* Exportación con filtro */}
            <form
              action="/panel/reporte-semanal"
              method="get"
              className="flex flex-wrap items-end gap-2"
            >
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
                  Semana
                </label>
                <input type="date" name="semana" defaultValue={semana} required />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
                  Estado
                </label>
                <select name="estado" defaultValue="todos" className="h-9">
                  <option value="todos">Todos</option>
                  <option value="verificado">Verificados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="rechazado">Rechazados</option>
                </select>
              </div>
              <button className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold text-banda hover:bg-papel">
                ⤓ Descargar Excel
              </button>
            </form>
          </div>
          <div className="overflow-x-auto rounded-grande bg-white shadow-[var(--elev)]">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-borde bg-[#e8eef7] text-[11px] uppercase tracking-wider text-tinta2">
                  <th className="px-5 py-2.5 text-left font-semibold">Centro</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Cons.</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Interv.</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Hosp.</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Estado</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {deLaSemana.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-tinta3">
                      Ningún centro ha reportado esta semana todavía.
                    </td>
                  </tr>
                )}
                {deLaSemana.map((r) => {
                  const h = centros.find((c) => c.id === r.hospitalId);
                  const t = (k: string) =>
                    Number(r[`${k}Militar` as keyof typeof r]) +
                    Number(r[`${k}Afiliado` as keyof typeof r]) +
                    Number(r[`${k}Pna` as keyof typeof r]);
                  return (
                    <tr key={r.id} className="border-b border-bordesuave last:border-0">
                      <td className="px-5 py-2.5">
                        <div className="font-semibold">{h?.nombre ?? "—"}</div>
                        <div className="text-[11px] text-tinta3">{h?.ubicacion}</div>
                        {r.observacionCentro && (
                          <div className="text-[11px] italic text-tinta2">“{r.observacionCentro}”</div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center font-semibold">{t("consultas")}</td>
                      <td className="px-2 py-2.5 text-center font-semibold">{t("intervenciones")}</td>
                      <td className="px-2 py-2.5 text-center font-semibold">{t("hospitalizaciones")}</td>
                      <td className="px-2 py-2.5 text-center">
                        <EtiquetaEstado estado={r.estado} />
                      </td>
                      <td className="px-5 py-2.5">
                        {r.estado === "pendiente" && (
                          <form action={accionRevisarReporte} className="flex justify-end gap-2">
                            <input type="hidden" name="id" value={r.id} />
                            <input
                              name="observacionAdmin"
                              placeholder="Observación (al rechazar)"
                              className="w-44 text-[12px]"
                            />
                            <button
                              name="estado"
                              value="verificado"
                              className="h-8 rounded-chico bg-verifica px-3 text-[12px] font-semibold text-white hover:brightness-110"
                            >
                              Verificar
                            </button>
                            <button
                              name="estado"
                              value="rechazado"
                              className="h-8 rounded-chico border border-fecha/40 px-3 text-[12px] font-semibold text-fecha hover:bg-fecha/10"
                            >
                              Rechazar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {faltantes.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-tinta2">
              Sin reportar esta semana ({faltantes.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {faltantes.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full border border-bordesuave bg-white px-3 py-1 text-[12px] font-medium text-tinta2"
                >
                  {c.nombre}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Bitácora de accesos */}
        <section className="mt-8">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-tinta2">
            Últimos ingresos
          </h2>
          <div className="overflow-x-auto rounded-grande bg-white shadow-[var(--elev)]">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-borde bg-[#e8eef7] text-[11px] uppercase tracking-wider text-tinta2">
                  <th className="px-5 py-2.5 text-left font-semibold">Usuario</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Acción</th>
                  <th className="px-2 py-2.5 text-center font-semibold">IP</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Fecha y hora</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-tinta3">
                      Sin registros todavía.
                    </td>
                  </tr>
                )}
                {ingresos.map((b) => {
                  const estilo =
                    b.accion === "login_exitoso"
                      ? "bg-verifica/10 text-verifica"
                      : b.accion === "login_fallido"
                        ? "bg-fecha/10 text-fecha"
                        : "bg-control text-tinta2";
                  return (
                    <tr key={b.id} className="border-b border-bordesuave last:border-0">
                      <td className="px-5 py-2.5">
                        <div className="font-semibold">{b.email}</div>
                        <div className="text-[11px] capitalize text-tinta3">{b.rol || "—"}</div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estilo}`}>
                          {b.accion === "login_fallido" ? "clave errada" : b.accion.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-tinta2">{b.ip || "—"}</td>
                      <td className="px-5 py-2.5 text-right text-tinta2">
                        {new Date(b.fecha + "Z").toLocaleString("es-VE")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metrica({ etiqueta, valor, destaque }: { etiqueta: string; valor: number; destaque?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-tinta3">{etiqueta}</div>
      <div className={`text-[26px] font-bold leading-tight ${destaque ? "text-fecha" : ""}`}>{valor}</div>
    </div>
  );
}

function EtiquetaEstado({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    pendiente: "bg-[#fdf3e3] text-[#9a6b16]",
    verificado: "bg-verifica/10 text-verifica",
    rechazado: "bg-fecha/10 text-fecha",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${estilos[estado]}`}>
      {estado}
    </span>
  );
}
