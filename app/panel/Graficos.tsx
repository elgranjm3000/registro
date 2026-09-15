"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import type { Reporte } from "@/lib/db/schema";

const COLORES = { Militar: "#4caf6d", Afiliado: "#2f9ec7", Pna: "#d64541" };
const CATS = ["Militar", "Afiliado", "Pna"] as const;
const sumar = (rs: Reporte[], k: string, c: string) =>
  rs.filter((r) => r.estado !== "rechazado").reduce((a, r) => a + (r[`${k}${c}` as keyof Reporte] as number), 0);

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiqueta = (iso: string) => `${Number(iso.slice(8, 10))}${MESES[Number(iso.slice(5, 7)) - 1]}`;

export default function Graficos({
  historicos,
  deLaSemana,
}: {
  historicos: Reporte[];
  deLaSemana: Reporte[];
}) {
  const torta = CATS.map((c) => ({
    name: c.toUpperCase(),
    value:
      sumar(deLaSemana, "consultas", c) +
      sumar(deLaSemana, "intervenciones", c) +
      sumar(deLaSemana, "hospitalizaciones", c),
  }));
  const total = torta.reduce((a, d) => a + d.value, 0);

  const tendencia = [...historicos]
    .sort((a, b) => a.semanaDesde.localeCompare(b.semanaDesde))
    .reduce<{ semana: string; Consultas: number; Intervenciones: number; Hospitalizaciones: number }[]>(
      (acc, r) => {
        let fila = acc.find((f) => f.semana === r.semanaDesde);
        if (!fila) {
          fila = { semana: r.semanaDesde, Consultas: 0, Intervenciones: 0, Hospitalizaciones: 0 };
          acc.push(fila);
        }
        fila.Consultas += sumar([r], "consultas", "Militar") + sumar([r], "consultas", "Afiliado") + sumar([r], "consultas", "Pna");
        fila.Intervenciones += sumar([r], "intervenciones", "Militar") + sumar([r], "intervenciones", "Afiliado") + sumar([r], "intervenciones", "Pna");
        fila.Hospitalizaciones += sumar([r], "hospitalizaciones", "Militar") + sumar([r], "hospitalizaciones", "Afiliado") + sumar([r], "hospitalizaciones", "Pna");
        return acc;
      },
      [],
    );

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[380px_1fr]">
      {/* Réplica del formato oficial: torta con los tres colores fijos */}
      <div className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-tinta2">
          Distribución por categoría · semana actual
        </div>
        <div className="relative mt-2 h-56">
          {total === 0 ? (
            <p className="flex h-full items-center justify-center text-[13px] text-tinta3">
              Sin datos verificados aún.
            </p>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={torta}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {torta.map((d) => (
                    <Cell key={d.name} fill={COLORES[d.name as keyof typeof COLORES]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown, n: unknown) => [`${v} (${Math.round((Number(v) / total) * 100)}%)`, String(n)]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {total > 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[24px] font-bold leading-none text-tinta">{total}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-tinta3">Total</div>
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-center gap-4">
          {torta.map((d) => (
            <span key={d.name} className="categoria categoria-militar" style={{ ["--cat" as string]: COLORES[d.name as keyof typeof COLORES], color: COLORES[d.name as keyof typeof COLORES] }}>
              {d.name} · {d.value}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-tinta2">
          Tendencia por semana (reportes verificados)
        </div>
        {tendencia.length === 0 ? (
          <p className="mt-8 text-[13px] text-tinta3">
            Aparecerá cuando los reportes sean verificados.
          </p>
        ) : (
          <div className="mt-2 h-64">
            <ResponsiveContainer>
              <BarChart data={tendencia} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,35,59,.08)" vertical={false} />
                <XAxis dataKey={(d) => etiqueta(d.semana)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8593a8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8593a8" }} />
                <Tooltip cursor={{ fill: "rgba(22,35,59,.04)" }} />
                <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Consultas" fill="#0e2a52" radius={[3, 3, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Intervenciones" fill="#4caf6d" radius={[3, 3, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Hospitalizaciones" fill="#2f9ec7" radius={[3, 3, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
