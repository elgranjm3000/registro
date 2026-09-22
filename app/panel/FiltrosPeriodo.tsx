"use client";

import { useState } from "react";

type Centro = { id: number; nombre: string };

// Barra única de filtros: periodo (semana o mes) + centro + servicio.
// "Aplicar" actualiza la tabla; "Generar PDF" reutiliza los mismos valores.
export default function FiltrosPeriodo({
  centros,
  semana,
  mes,
  hospital,
  tipo,
}: {
  centros: Centro[];
  semana: string;
  mes: string | null;
  hospital: string;
  tipo: string;
}) {
  const [modo, setModo] = useState<"semana" | "mes">(mes ? "mes" : "semana");

  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2";
  const input =
    "h-9 rounded-chico border border-borde bg-white px-2.5 text-[13px] text-tinta focus:border-banda focus:outline-none";

  return (
    <form method="get" action="/panel" className="flex flex-wrap items-end gap-3">
      {/* Periodo: segmentado Semana | Mes */}
      <div>
        <span className={label}>Periodo</span>
        <div className="flex h-9 overflow-hidden rounded-chico border border-borde bg-white text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => setModo("semana")}
            className={`px-3 ${modo === "semana" ? "bg-banda text-white" : "text-tinta2 hover:bg-papel"}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setModo("mes")}
            className={`border-l border-borde px-3 ${modo === "mes" ? "bg-banda text-white" : "text-tinta2 hover:bg-papel"}`}
          >
            Mes
          </button>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="filtro-fecha">
          {modo === "semana" ? "Lunes de la semana" : "Mes"}
        </label>
        {modo === "semana" ? (
          <input id="filtro-fecha" type="date" name="semana" defaultValue={semana} className={input} />
        ) : (
          <input id="filtro-fecha" type="month" name="mes" defaultValue={mes ?? semana.slice(0, 7)} className={input} />
        )}
      </div>

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
