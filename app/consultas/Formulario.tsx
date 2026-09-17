"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Consulta, Especialidad, Reporte } from "@/lib/db/schema";
import { accionGuardarCifras, accionImportarConsultasCentro, type EstadoForm, type ResultadoExcel } from "@/lib/actions";
import { lunesActual, viernesDe } from "@/lib/fechas";

const TIPOS = [
  { valor: "consultas", etiqueta: "Consultas" },
  { valor: "intervenciones", etiqueta: "Intervenciones Qx" },
  { valor: "hospitalizaciones", etiqueta: "Hospitalizaciones" },
] as const;
type Tipo = (typeof TIPOS)[number]["valor"];

type Fila = { clave: number; esp: number | ""; tipo: Tipo; m: string; a: string; p: string; guardada?: boolean };

let seq = 1;
const filaNueva = (tipo: Tipo): Fila => ({ clave: seq++, esp: "", tipo, m: "", a: "", p: "" });

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
  const [tab, setTab] = useState<Tipo>("consultas");
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(accionGuardarCifras, {});
  const [estadoXl, accionXl, pendienteXl] = useActionState<ResultadoExcel, FormData>(
    accionImportarConsultasCentro,
    {},
  );

  // Filas de servicios: se precargan con lo guardado de la semana elegida
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargado, setCargado] = useState("");
  useEffect(() => {
    const deLaSemana = cifras.filter((c) => c.semanaDesde === semana);
    setFilas(
      deLaSemana.length
        ? deLaSemana.map((c) => ({
            clave: seq++,
            esp: c.especialidadId,
            tipo: c.tipo,
            guardada: true,
            m: c.militar ? String(c.militar) : "",
            a: c.afiliado ? String(c.afiliado) : "",
            p: c.pna ? String(c.pna) : "",
          }))
        : [],
    );
    setCargado(deLaSemana.length ? "si" : "no");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semana]);

  // Al guardar: refresca los datos del servidor (panel, historial, insignia)
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, router]);

  const quitarAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const [busqueda, setBusqueda] = useState("");
  const filasDelTab = filas.filter((f) => f.tipo === tab);
  const visibles = busqueda.trim()
    ? filasDelTab.filter((f) => {
        const e = especialidades.find((x) => x.id === f.esp);
        return e && quitarAcentos(e.nombre).toLowerCase().includes(quitarAcentos(busqueda).toLowerCase());
      })
    : filasDelTab;

  const editar = (clave: number, cambio: Partial<Fila>) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  const total = (f: Fila) => (Number(f.m) || 0) + (Number(f.a) || 0) + (Number(f.p) || 0);
  const totalTab = (t: Tipo) =>
    filas.filter((f) => f.tipo === t).reduce((a, f) => a + total(f), 0);
  const granTotal = filas.reduce((a, f) => a + total(f), 0);
  const rep = historial.find((r) => r.semanaDesde === semana);
  const etiquetaTab = TIPOS.find((t) => t.valor === tab)?.etiqueta ?? "";
  // Bloqueo: enviada (pendiente) o confirmada (verificada) no se puede editar.
  // "rechazado" = devuelta por la Sala Situacional para corrección.
  const enviado = !!rep && rep.estado !== "rechazado";
  const devuelta = rep?.estado === "rechazado";
  // Enviada: se puede AGREGAR, pero las filas ya enviadas no se editan ni eliminan
  const editable = (f: Fila) => devuelta || !enviado || !f.guardada;

  return (
    <div className="mt-6 space-y-6">
      <form action={accion} className="overflow-hidden rounded-grande bg-white shadow-[var(--elev)]">
        <div className="bg-banda px-4 py-4 sm:px-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-bandatinta">
            Reporte semanal de actividades
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
            <span
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                devuelta ? "bg-fecha/10 text-fecha" : "bg-verifica/10 text-verifica"
              }`}
            >
              {devuelta ? "Devuelta para corrección" : bloqueado ? "Enviada · bloqueada" : "Guardado"}
            </span>
          )}
        </div>
        {bloqueado && (
          <p className="border-b border-bordesuave bg-[#fdf3e3] px-4 py-3 text-[13px] font-semibold text-[#9a6b16] sm:px-6">
            📌 Esta semana ya fue enviada: puedes agregar servicios nuevos, pero no editar ni eliminar lo ya enviado. Solo la Sala Situacional puede reabrirlo.
          </p>
        )}
        {devuelta && (
          <p className="border-b border-bordesuave bg-fecha/10 px-4 py-3 text-[13px] font-semibold text-fecha sm:px-6">
            ↩ La Sala Situacional devolvió esta semana para corrección{rep?.observacionAdmin ? `: “${rep.observacionAdmin}”` : ""}. Edita y vuelve a enviar.
          </p>
        )}

        {/* Pestañas por servicio */}
        <div className="flex gap-1 border-b border-borde bg-papel px-4 pt-2 sm:px-6" role="tablist">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="tab"
              aria-selected={tab === t.valor}
              onClick={() => setTab(t.valor)}
              className={`-mb-px rounded-t-chico border border-b-0 px-4 py-2 text-[13px] font-semibold transition-colors ${
                tab === t.valor
                  ? "border-bordesuave bg-white text-banda"
                  : "border-transparent text-tinta3 hover:text-tinta2"
              }`}
            >
              {t.etiqueta}
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  tab === t.valor ? "bg-banda text-white" : "bg-control text-tinta2"
                }`}
              >
                {totalTab(t.valor)}
              </span>
            </button>
          ))}
        </div>

        {/* Buscador + agregar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
          <div className="relative w-fit">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={`Buscar especialidad en ${etiquetaTab}…`}
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
          </div>
          <button
            type="button"
            onClick={() => setFilas((fs) => [...fs, filaNueva(tab)])}
            className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold text-banda hover:bg-papel"
          >
            + Agregar en {etiquetaTab}
          </button>
        </div>

        {/* Filas del servicio activo. Todas permanecen en el DOM (ocultas con CSS)
            para que cada pestaña conserve y envíe su registro. */}
        <div className="overflow-x-auto px-4 pb-2 pt-3 sm:px-6">
          <table className="w-full min-w-[640px] text-[13px]">
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
              {filas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-tinta3">
                    Sin registros en {etiquetaTab} esta semana. Presiona “+ Agregar en {etiquetaTab}”.
                  </td>
                </tr>
              )}
              {filas.map((f) => {
                const i = filas.indexOf(f);
                const enEsteTab = f.tipo === tab;
                const e = especialidades.find((x) => x.id === f.esp);
                const visible =
                  enEsteTab &&
                  (!busqueda.trim() ||
                    (e &&
                      quitarAcentos(e.nombre)
                        .toLowerCase()
                        .includes(quitarAcentos(busqueda).toLowerCase())));
                return (
                  <tr
                    key={f.clave}
                    style={visible ? undefined : { display: "none" }}
                    className="border-b border-bordesuave last:border-0"
                  >
                    <td className="px-4 py-1.5">
                      <select
                        name={`fila-${i}-esp`}
                        value={f.esp}
                        onChange={(ev) => editar(f.clave, { esp: Number(ev.target.value) })}
                        disabled={!editable(f)}
                        className="w-56 disabled:opacity-60"
                        required
                      >
                        <option value="" disabled>
                          Seleccionar…
                        </option>
                        {especialidades.map((e2) => (
                          <option key={e2.id} value={e2.id}>
                            {e2.nombre}
                          </option>
                        ))}
                      </select>
                      {/* El tipo viaja oculto: lo define la pestaña activa */}
                      <input type="hidden" name={`fila-${i}-tipo`} value={f.tipo} />
                    </td>
                    {(["m", "a", "p"] as const).map((c) => (
                      <td key={c} className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min={0}
                          name={`fila-${i}-${c}`}
                          value={f[c]}
                          onChange={(ev) => editar(f.clave, { [c]: ev.target.value })}
                          disabled={!editable(f)}
                          className="w-20 text-center disabled:opacity-60"
                        />
                      </td>
                    ))}
                    <td className="rounded-r-chico px-4 py-1.5 text-right font-bold">{total(f)}</td>
                  </tr>
                );
              })}
              {filasDelTab.length > 0 && (
                <tr className="bg-[#e8eef7]">
                  <td className="px-4 py-2 text-[12px] font-bold uppercase tracking-wider" colSpan={4}>
                    Total {etiquetaTab}
                  </td>
                  <td className="rounded-r-chico px-2 py-2 text-right text-[16px] font-bold text-banda">{totalTab(tab)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-bordesuave px-4 py-4 sm:px-6">
          <span className="text-[12px] font-medium text-tinta3">
            Total general de la semana: <strong className="text-tinta">{granTotal}</strong>
            {" · "}Las tres pestañas se guardan juntas.
          </span>
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
            {pendiente ? "Enviando…" : enviado ? "Agregar y enviar" : "Enviar carga"}
          </button>
        </div>
      </form>

      {/* Carga vía Excel */}
      <div className="rounded-grande bg-white p-5 shadow-[var(--elev)]">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-tinta2">
          Cargar servicios vía Excel
        </h2>
        <p className="mt-2 text-[13px] text-tinta2">
          Columnas: <span className="font-semibold">Especialidad, Tipo, Militar, Afiliado, PNA, Semana</span>{" "}
          (Tipo: Consulta, Intervención u Hospitalización; Semana: lunes en AAAA-MM-DD).
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
