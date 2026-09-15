import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pacientes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";
import { accionEliminarPaciente } from "@/lib/actions";
import Encabezado from "@/components/Encabezado";
import FormularioPaciente from "./Formulario";
import ImportarPacientes from "./Importar";

const CATEGORIA_CLASE: Record<string, string> = {
  militar: "categoria-militar",
  afiliado: "categoria-afiliado",
  pna: "categoria-pna",
};

export default async function PaginaPacientes() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== "centro" || !sesion.hospitalId) redirect("/panel");

  const lista = await db
    .select()
    .from(pacientes)
    .where(eq(pacientes.hospitalId, sesion.hospitalId))
    .orderBy(desc(pacientes.fecha), desc(pacientes.id))
    .limit(100);

  return (
    <div className="min-h-dvh">
      <Encabezado subtitulo="Registro de pacientes" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold leading-tight">Pacientes atendidos</h1>
            <p className="mt-1 text-[13px] font-medium text-tinta2">
              Registra cada paciente con su categoría. El reporte semanal se calcula con estos datos.
            </p>
          </div>
          <a href="/reportar" className="text-[13px] font-semibold text-banda hover:underline">
            Ir al reporte semanal →
          </a>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <FormularioPaciente />
            <ImportarPacientes />
          </div>

          <div className="overflow-x-auto rounded-grande bg-white shadow-[var(--elev)]">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-borde bg-[#e8eef7] text-[11px] uppercase tracking-wider text-tinta2">
                  <th className="px-5 py-2.5 text-left font-semibold">Paciente</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Categoría</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Actividad</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Fecha</th>
                  <th className="px-5 py-2.5 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-tinta3">
                      Aún no hay pacientes registrados. Comienza con el formulario.
                    </td>
                  </tr>
                )}
                {lista.map((p) => (
                  <tr key={p.id} className="border-b border-bordesuave last:border-0">
                    <td className="px-5 py-2.5">
                      <div className="font-semibold">{p.nombre}</div>
                      <div className="text-[11px] text-tinta3">
                        {p.cedula || "s/cédula"} · {p.sexo === "F" ? "F" : "M"}
                        {p.edad ? ` · ${p.edad} años` : ""}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`categoria ${CATEGORIA_CLASE[p.categoria]}`}>
                        {p.categoria.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center capitalize">{p.actividad}</td>
                    <td className="px-2 py-2.5 text-center text-tinta2">
                      {p.fecha.split("-").reverse().join("/")}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <form action={accionEliminarPaciente}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="text-[12px] font-semibold text-fecha hover:underline">
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
