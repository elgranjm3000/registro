"use client";

import { useActionState } from "react";
import { accionImportarPacientes, type ResultadoPacientes } from "@/lib/actions";

export default function ImportarPacientes() {
  const [estado, accion, pendiente] = useActionState<ResultadoPacientes, FormData>(
    accionImportarPacientes,
    {},
  );

  return (
    <div className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
      <h2 className="text-[13px] font-bold uppercase tracking-wider text-tinta2">
        Cargar pacientes vía Excel
      </h2>
      <p className="mt-2 text-[13px] text-tinta2">
        Descarga la plantilla demo, llénala con tus pacientes y súbela. Columnas:{" "}
        <span className="font-semibold">Nombre, Cédula, Edad, Sexo, Categoria, Actividad, Fecha</span>{" "}
        (AAAA-MM-DD o DD/MM/AAAA).
      </p>
      <form action={accion} className="mt-3 flex flex-wrap items-end gap-3">
        <a
          href="/pacientes/plantilla"
          className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold leading-9 text-banda hover:bg-papel"
        >
          ⤓ Descargar plantilla demo
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
          {pendiente ? "Importando…" : "Importar"}
        </button>
      </form>

      {estado.ok && (
        <p className="mt-3 rounded-medio bg-verifica/10 px-4 py-2.5 text-[13px] font-semibold text-verifica">
          {estado.ok}
        </p>
      )}
      {estado.error && (
        <p className="mt-3 rounded-medio bg-fecha/10 px-4 py-2.5 text-[13px] font-semibold text-fecha">
          {estado.error}
        </p>
      )}
      {estado.detalle && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto rounded-medio bg-papel px-4 py-3 text-[12px] text-tinta2">
          {estado.detalle.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
