"use client";

import { useState } from "react";
import type { Paciente, Reporte } from "@/lib/db/schema";

const FILAS = [
  { key: "consultas", etiqueta: "Consultas" },
  { key: "intervenciones", etiqueta: "Intervenciones" },
  { key: "hospitalizaciones", etiqueta: "Hospitalizaciones" },
] as const;
const CATS = ["Militar", "Afiliado", "Pna"] as const;
const campo = (f: string, c: string) => `${f}${c[0].toUpperCase()}${c.slice(1)}`;

const lunes = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const viernes = (desde: string) => {
  const d = new Date(desde + "T12:00:00");
  d.setDate(d.getDate() + 4);
  return d.toISOString().slice(0, 10);
};

const ESTILO_ESTADO: Record<string, string> = {
  pendiente: "bg-[#fdf3e3] text-[#9a6b16]",
  verificado: "bg-verifica/10 text-verifica",
  rechazado: "bg-fecha/10 text-fecha",
};

// Vista de solo lectura: el reporte se genera y envía solo al registrar pacientes.
export default function FormularioReporte({
  historial,
  atenciones,
}: {
  historial: Reporte[];
  atenciones: Paciente[];
}) {
  const [semanaDesde, setSemanaDesde] = useState(lunes());
  const fin = viernes(semanaDesde);

  const conteos: Record<string, number> = {};
  for (const f of FILAS) for (const c of CATS) conteos[campo(f.key, c)] = 0;
  for (const p of atenciones) {
    if (p.fecha >= semanaDesde && p.fecha <= fin) {
      const suf = p.categoria === "militar" ? "Militar" : p.categoria === "afiliado" ? "Afiliado" : "Pna";
      conteos[`${p.actividad}${suf}`] += 1;
    }
  }
  const total = (f: (typeof FILAS)[number]["key"]) =>
    CATS.reduce((a, c) => a + conteos[campo(f, c)], 0);
  const totalGeneral = FILAS.reduce((a, f) => a + total(f.key), 0);

  const existente = historial.find((r) => r.semanaDesde === semanaDesde);
  const hayPacientes = atenciones.some((p) => p.fecha >= semanaDesde && p.fecha <= fin);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-grande bg-white shadow-[var(--elev)]">
        <div className="bg-banda px-6 py-4 sm:px-6 px-4">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-bandatinta">
            Reporte semanal de actividades
          </h2>
          <span className="mt-1 block text-[12px] font-bold uppercase tracking-wide text-fecha">
            Desde el {semanaDesde.split("-").reverse().join("")} hasta el {fin.split("-").reverse().join("")}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-b border-bordesuave px-6 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
              Ver semana desde (lunes)
            </label>
            <input
              type="date"
              value={semanaDesde}
              onChange={(e) => setSemanaDesde(e.target.value)}
            />
          </div>
          {existente ? (
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold capitalize ${ESTILO_ESTADO[existente.estado]}`}>
              Enviado · {existente.estado}
            </span>
          ) : hayPacientes ? (
            <span className="rounded-full bg-[#fdf3e3] px-3 py-1 text-[12px] font-semibold text-[#9a6b16]">
              Sincronizando…
            </span>
          ) : (
            <span className="rounded-full bg-control px-3 py-1 text-[12px] font-semibold text-tinta3">
              Sin pacientes esta semana
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[14px]">
          <thead>
            <tr className="border-b border-borde bg-[#e8eef7] text-[11px] uppercase tracking-wider text-tinta2">
              <th className="px-6 py-2.5 text-left font-semibold">Actividad</th>
              <th className="px-3 py-2.5 text-center font-semibold">Militar</th>
              <th className="px-3 py-2.5 text-center font-semibold">Afiliado</th>
              <th className="px-3 py-2.5 text-center font-semibold">PNA</th>
              <th className="px-6 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {FILAS.map((f) => (
              <tr key={f.key} className="border-b border-bordesuave">
                <td className="px-6 py-2.5 font-semibold">{f.etiqueta}</td>
                {CATS.map((c) => (
                  <td key={c} className="px-3 py-2.5 text-center text-[15px] font-semibold">
                    {conteos[campo(f.key, c)]}
                  </td>
                ))}
                <td className="px-6 py-2.5 text-right text-[15px] font-bold">{total(f.key)}</td>
              </tr>
            ))}
            <tr className="bg-[#e8eef7]">
              <td className="px-6 py-3 font-bold uppercase text-[12px] tracking-wider" colSpan={4}>
                Total general
              </td>
              <td className="px-6 py-3 text-right text-[18px] font-bold text-banda">{totalGeneral}</td>
            </tr>
          </tbody>
          </table>
        </div>

        <div className="px-6 py-4 text-[12px] font-medium text-tinta3">
          Este reporte se envía automáticamente a la Sala Situacional al registrar pacientes.
          {existente?.observacionAdmin && (
            <span className="mt-1 block italic text-tinta2">
              Observación de la Sala Situacional: “{existente.observacionAdmin}”
            </span>
          )}
        </div>
      </div>

      <aside>
        <div className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-tinta2">
            Historial de semanas enviadas
          </h3>
          {historial.length === 0 && (
            <p className="text-[13px] text-tinta3">Aún no hay reportes enviados.</p>
          )}
          <ul className="space-y-2.5">
            {historial.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-[13px]">
                <span className="font-medium">
                  {r.semanaDesde.slice(5)} → {r.semanaHasta.slice(5)}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${ESTILO_ESTADO[r.estado]}`}>
                  {r.estado}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
