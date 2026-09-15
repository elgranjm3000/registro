"use client";

import { useActionState, useState } from "react";
import type { Consulta, Especialidad, Reporte } from "@/lib/db/schema";
import { accionGuardarCifras, accionImportarConsultasCentro, type EstadoForm, type ResultadoExcel } from "@/lib/actions";
import { lunesActual, viernesDe } from "@/lib/fechas";

const CATS = [
  { suf: "m", etiqueta: "Militar" },
  { suf: "a", etiqueta: "Afiliado" },
  { suf: "p", etiqueta: "PNA" },
] as const;

export default function FormularioCifras({
  especialidades,
  cifras,
  historial,
}: {
  especialidades: Especialidad[];
  cifras: Consulta[];
  historial: Reporte[];
}) {
  const [semana, setSemana] = useState(lunesActual());
  const [busqueda, setBusqueda] = useState("");
  const quitarAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibles = busqueda.trim()
    ? especialidades.filter((e) =>
        quitarAcentos(e.nombre).toLowerCase().includes(quitarAcentos(busqueda).toLowerCase()),
      )
    : especialidades;
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(accionGuardarCifras, {});
  const [estadoXl, accionXl, pendienteXl] = useActionState<ResultadoExcel, FormData>(
    accionImportarConsultasCentro,
    {},
  );

  const de = (espId: number, suf: string) =>
    cifras.find((c) => c.especialidadId === espId && c.semanaDesde === semana)?.[
      suf as "militar" | "afiliado" | "pna"
    ] ?? 0;
  const rep = historial.find((r) => r.semanaDesde === semana);
  const totalEsp = (e: Especialidad) => CATS.reduce((a, c) => a + de(e.id, c.suf), 0);
  const granTotal = especialidades.reduce((a, e) => a + totalEsp(e), 0);

  const input = (name: string, valor: number) => (
    <input
      type="number"
      min={0}
      name={name}
      defaultValue={valor || ""}
      className="w-20 text-center"
    />
  );

  return (
    <div className="mt-6 space-y-6">
      <form action={accion} className="overflow-hidden rounded-grande bg-white shadow-[var(--elev)]">
        <div className="bg-banda px-4 py-4 sm:px-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-bandatinta">
            Reporte de la semana
          </h2>
          <span className="mt-1 block text-[12px] font-bold uppercase tracking-wide text-fecha">
            Desde el {semana.slice(8)}{semana.slice(5, 7)} hasta el {viernesDe(semana).slice(8)}{viernesDe(semana).slice(5, 7)}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-b border-bordesuave px-4 py-4 sm:px-6">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
              Semana desde (lunes)
            </label>
            <input type="date" name="semanaDesde" value={semana} onChange={(e) => setSemana(e.target.value)} required />
          </div>
          {rep && (
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold capitalize ${
              rep.estado === "verificado" ? "bg-verifica/10 text-verifica" : rep.estado === "rechazado" ? "bg-fecha/10 text-fecha" : "bg-[#fdf3e3] text-[#9a6b16]"
            }`}>
              Reporte: {rep.estado}
            </span>
          )}
        </div>

        {/* Consultas por especialidad */}
        <div className="px-4 pt-4 sm:px-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-tinta2">
            Cantidad de consultas por especialidad
          </h3>
          <div className="relative mt-2 w-fit">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar especialidad…"
              className="w-56 !bg-white pl-8"
              aria-label="Buscar especialidad"
            />
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 bg-transparent text-tinta3"
              viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 4 4" strokeLinecap="round" />
            </svg>
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent text-[11px] font-semibold text-tinta3 hover:text-tinta"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {busqueda.trim() && visibles.length === 0 && (
          <p className="px-4 pb-2 pt-3 text-[13px] text-tinta3 sm:px-6">
            Ninguna especialidad coincide con “{busqueda}”.
          </p>
        )}
        <div className="overflow-x-auto px-4 pb-2 pt-2 sm:px-6">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-borde bg-[#e8eef7] text-[11px] uppercase tracking-wider text-tinta2">
                <th className="rounded-l-chico px-4 py-2 text-left font-semibold">Especialidad</th>
                <th className="px-2 py-2 text-center font-semibold">Militar</th>
                <th className="px-2 py-2 text-center font-semibold">Afiliado</th>
                <th className="px-2 py-2 text-center font-semibold">PNA</th>
                <th className="rounded-r-chico px-4 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e, i) => (
                <tr key={e.id} className={i % 2 ? "bg-papel/60" : ""}>
                  <td className="px-4 py-1.5 font-medium">{e.nombre}</td>
                  {CATS.map((c) => (
                    <td key={c.suf} className="px-2 py-1.5 text-center">
                      {input(`esp-${e.id}-${c.suf}`, de(e.id, c.suf))}
                    </td>
                  ))}
                  <td className="px-4 py-1.5 text-right font-bold">{totalEsp(e)}</td>
                </tr>
              ))}
              <tr className="bg-[#e8eef7]">
                <td className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider" colSpan={4}>
                  Total consultas
                </td>
                <td className="px-4 py-2 text-right text-[16px] font-bold text-banda">{granTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Intervenciones y hospitalizaciones */}
        <div className="grid gap-6 px-4 py-4 sm:grid-cols-2 sm:px-6">
          {[
            { pref: "interv", titulo: "Intervenciones", m: rep?.intervencionesMilitar ?? 0, a: rep?.intervencionesAfiliado ?? 0, p: rep?.intervencionesPna ?? 0 },
            { pref: "hosp", titulo: "Hospitalizaciones", m: rep?.hospitalizacionesMilitar ?? 0, a: rep?.hospitalizacionesAfiliado ?? 0, p: rep?.hospitalizacionesPna ?? 0 },
          ].map((s) => (
            <div key={s.pref}>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-tinta2">{s.titulo}</h3>
              <div className="grid grid-cols-3 gap-2">
                {CATS.map((c, i) => (
                  <label key={c.suf} className="block">
                    <span className="mb-1 block text-[11px] font-medium text-tinta3">{c.etiqueta}</span>
                    {input(`${s.pref}${["Militar", "Afiliado", "Pna"][i]}`, [s.m, s.a, s.p][i])}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-bordesuave px-4 py-4 sm:px-6">
          {estado.ok && (
            <p className="rounded-medio bg-verifica/10 px-4 py-2.5 text-[13px] font-semibold text-verifica">{estado.ok}</p>
          )}
          {estado.error && (
            <p className="rounded-medio bg-fecha/10 px-4 py-2.5 text-[13px] font-semibold text-fecha">{estado.error}</p>
          )}
          <button
            disabled={pendiente}
            className="ml-auto h-10 rounded-chico bg-banda px-5 font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : "Guardar y enviar a verificación"}
          </button>
        </div>
      </form>

      {/* Carga vía Excel */}
      <div className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-tinta2">
          Cargar consultas vía Excel
        </h2>
        <p className="mt-2 text-[13px] text-tinta2">
          Columnas: <span className="font-semibold">Especialidad, Militar, Afiliado, PNA, Semana</span> (lunes en AAAA-MM-DD).
        </p>
        <form action={accionXl} className="mt-3 flex flex-wrap items-end gap-3">
          <a
            href="/consultas/plantilla"
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
            disabled={pendienteXl}
            className="h-9 rounded-chico bg-banda px-5 text-[13px] font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
          >
            {pendienteXl ? "Importando…" : "Importar"}
          </button>
        </form>
        {estadoXl.ok && (
          <p className="mt-3 rounded-medio bg-verifica/10 px-4 py-2.5 text-[13px] font-semibold text-verifica">{estadoXl.ok}</p>
        )}
        {estadoXl.error && (
          <p className="mt-3 rounded-medio bg-fecha/10 px-4 py-2.5 text-[13px] font-semibold text-fecha">{estadoXl.error}</p>
        )}
        {estadoXl.detalle && (
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto rounded-medio bg-papel px-4 py-3 text-[12px] text-tinta2">
            {estadoXl.detalle.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
