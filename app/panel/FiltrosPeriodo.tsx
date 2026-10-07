"use client";

import { useState } from "react";

type Centro = { id: number; nombre: string };
type Esp = { id: number; nombre: string };

// Barra única de filtros: periodo (semana / mes / año, con rango de meses) + centro + servicio + especialidad.
// "Aplicar" actualiza la tabla; "Generar PDF" reutiliza los mismos valores.
export default function FiltrosPeriodo({
  centros,
  especialidades,
  semana,
  mes,
  hospital,
  tipo,
  especialidad,
}: {
  centros: Centro[];
  especialidades: Esp[];
  semana: string;
  mes: string | null;
  hospital: string;
  tipo: string;
  especialidad: string;
}) {
  const [modo, setModo] = useState<"semana" | "mes" | "anio">(mes ? "mes" : "semana");

  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2";
  const input =
    "h-9 rounded-chico border border-borde bg-white px-2.5 text-[13px] text-tinta focus:border-banda focus:outline-none";
  const anio = semana.slice(0, 4);

  return (
    <form method="get" action="/panel" className="flex flex-wrap items-end gap-3">
      {/* Periodo: segmentado Semana | Mes | Año */}
      <div>
        <span className={label}>Periodo</span>
        <div className="flex h-9 overflow-hidden rounded-chico border border-borde bg-white text-[12px] font-semibold">
          {(
            [
              ["semana", "Semana"],
              ["mes", "Mes"],
              ["anio", "Año"],
            ] as const
          ).map(([v, et], i) => (
            <button
              key={v}
              type="button"
              onClick={() => setModo(v)}
              className={`px-3 ${i > 0 ? "border-l border-borde" : ""} ${
                modo === v ? "bg-banda text-white" : "text-tinta2 hover:bg-papel"
              }`}
            >
              {et}
            </button>
          ))}
        </div>
      </div>

      {modo === "semana" && (
        <div>
          <label className={label} htmlFor="filtro-fecha">
            Día (se toma su semana)
          </label>
          <input id="filtro-fecha" type="date" name="semana" defaultValue={semana} className={input} />
        </div>
      )}

      {modo === "mes" && (
        <>
          <div>
            <label className={label} htmlFor="filtro-mes">
              Desde el mes
            </label>
            <input id="filtro-mes" type="month" name="mes" defaultValue={mes ?? `${anio}-01`} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="filtro-meshasta">
              Hasta (opcional)
            </label>
            <input id="filtro-meshasta" type="month" name="mesHasta" className={input} />
          </div>
        </>
      )}

      {modo === "anio" && (
        <div>
          <label className={label} htmlFor="filtro-anio">
            Año
          </label>
          <input
            id="filtro-anio"
            type="number"
            name="anio"
            min="2020"
            max="2100"
            defaultValue={anio}
            className={`${input} w-24`}
          />
        </div>
      )}

      <div>
        <label className={label} htmlFor="filtro-hospital">
          Centro de salud
        </label>
        <select id="filtro-hospital" name="hospital" defaultValue={hospital} className={`${input} max-w-52`}>
          <option value="todos">Todos los centros</option>
          {centros.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="filtro-tipo">
          Servicio
        </label>
        <select id="filtro-tipo" name="tipo" defaultValue={tipo} className={input}>
          <option value="todos">Todos</option>
          <option value="consultas">Consultas</option>
          <option value="intervenciones">Intervenciones Qx</option>
          <option value="hospitalizaciones">Hospitalizaciones</option>
        </select>
      </div>

      <div>
        <label className={label} htmlFor="filtro-esp">
          Especialidad
        </label>
        <select id="filtro-esp" name="especialidad" defaultValue={especialidad} className={`${input} max-w-48`}>
          <option value="">Todas las especialidades</option>
          {especialidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>

      <button className="h-9 rounded-chico bg-banda px-4 text-[13px] font-semibold text-white hover:brightness-110">
        Aplicar
      </button>
      <button
        type="submit"
        formAction="/panel/reporte-pdf"
        className="h-9 rounded-chico border border-banda/40 px-4 text-[13px] font-semibold text-banda hover:bg-banda/10"
      >
        🖨 Generar PDF
      </button>
    </form>
  );
}
