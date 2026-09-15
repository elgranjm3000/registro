"use client";

import { useActionState } from "react";
import { accionImportarPacientesAdmin, type ResultadoPacientes } from "@/lib/actions";

export default function ImportarPacientesAdmin() {
  const [estado, accion, pendiente] = useActionState<ResultadoPacientes, FormData>(
    accionImportarPacientesAdmin,
    {},
  );

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-tinta2">
        Cargar pacientes de los centros vía Excel
      </h2>
      <form action={accion} className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
        <p className="mb-4 max-w-2xl text-[13px] text-tinta2">
          Descarga la plantilla con los desplegables de <span className="font-semibold">Centro</span>,{" "}
          <span className="font-semibold">Categoría</span> (Militar/Afiliado/PNA) y{" "}
          <span className="font-semibold">Actividad</span>. Cada paciente queda registrado en su
          centro y el reporte semanal se actualiza solo.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <a
            href="/panel/plantilla-pacientes"
            className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold leading-9 text-banda hover:bg-papel"
          >
            ⤓ Descargar plantilla con desplegables
          </a>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
              Archivo .xlsx
            </label>
            <input
              type="file"
              name="archivo"
              accept=".xlsx,.xls"
              required
              className="file:mr-3 file:rounded-chico file:border-0 file:bg-control file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-tinta"
            />
          </div>
          <button
            disabled={pendiente}
            className="h-9 rounded-chico bg-banda px-5 text-[13px] font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
          >
            {pendiente ? "Importando…" : "Cargar pacientes"}
          </button>
        </div>

        {estado.ok && (
          <p className="mt-4 rounded-medio bg-verifica/10 px-4 py-3 text-[13px] font-semibold text-verifica">
            {estado.ok}
          </p>
        )}
        {estado.error && (
          <p className="mt-4 rounded-medio bg-fecha/10 px-4 py-3 text-[13px] font-semibold text-fecha">
            {estado.error}
          </p>
        )}
        {estado.detalle && (
          <ul className="mt-2 max-h-44 space-y-1 overflow-auto rounded-medio bg-papel px-4 py-3 text-[12px] text-tinta2">
            {estado.detalle.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </form>
    </section>
  );
}
