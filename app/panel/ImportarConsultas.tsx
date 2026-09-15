"use client";

import { useActionState } from "react";
import { accionCrearEspecialidad, accionImportarConsultasAdmin, type EstadoForm, type ResultadoExcel } from "@/lib/actions";

export function ImportarConsultasAdmin() {
  const [estado, accion, pendiente] = useActionState<ResultadoExcel, FormData>(
    accionImportarConsultasAdmin,
    {},
  );

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-tinta2">
        Cargar consultas de los centros vía Excel
      </h2>
      <form action={accion} className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
        <p className="mb-4 max-w-2xl text-[13px] text-tinta2">
          Una fila por centro y especialidad. Columnas:{" "}
          <span className="font-semibold">Centro, Especialidad, Militar, Afiliado, PNA, Semana</span>{" "}
          (lunes en AAAA-MM-DD). Los desplegables de la plantilla garantizan nombres válidos.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <a
            href="/panel/plantilla-consultas"
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
            {pendiente ? "Importando…" : "Importar consultas"}
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

export function CrearEspecialidad() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(
    accionCrearEspecialidad,
    {},
  );

  return (
    <form action={accion} className="mt-4 flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
          Nueva especialidad
        </label>
        <input name="nombre" placeholder="Ej: GERIATRÍA" className="w-56" required />
      </div>
      <button
        disabled={pendiente}
        className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold text-banda hover:bg-papel disabled:opacity-60"
      >
        {pendiente ? "Agregando…" : "+ Agregar"}
      </button>
      {estado.ok && (
        <p className="text-[12px] font-semibold text-verifica">{estado.ok}</p>
      )}
      {estado.error && (
        <p className="text-[12px] font-semibold text-fecha">{estado.error}</p>
      )}
    </form>
  );
}
