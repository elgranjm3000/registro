"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Hospital } from "@/lib/db/schema";
import { accionAlternarCentro, accionEliminarCentro, type EstadoForm } from "@/lib/actions";

export type AccionCentro = "desactivar" | "reactivar" | "eliminar";

// Lo que el centro tiene cargado. Decide qué se puede hacer con él y qué se avisa.
export type DatosCentro = {
  reportes: number;
  consultas: number;
  periodo: string;
};

export type Destino = {
  hospital: Hospital;
  usuario: string | null;
  datos: DatosCentro;
  accion: AccionCentro;
};

// <dialog> nativo: trae foco atrapado, Escape, velo y capa superior sin dependencias.
// El cuerpo no es un "¿estás seguro?" genérico — dice qué se pierde y qué no, en las
// palabras del registro, porque esa es la información con la que se decide.
export default function DialogoCentro({
  destino,
  onCerrar,
}: {
  destino: Destino;
  onCerrar: () => void;
}) {
  const { hospital, usuario, datos, accion } = destino;
  const ref = useRef<HTMLDialogElement>(null);

  const [estadoBaja, accionBaja, pendienteBaja] = useActionState<EstadoForm, FormData>(
    accionAlternarCentro,
    {},
  );
  const [estadoBorra, accionBorra, pendienteBorra] = useActionState<EstadoForm, FormData>(
    accionEliminarCentro,
    {},
  );

  const ok = estadoBaja.ok ?? estadoBorra.ok;
  const error = estadoBaja.error ?? estadoBorra.error;
  const pendiente = pendienteBaja || pendienteBorra;
  const eliminar = accion === "eliminar";

  // El diálogo se monta solo cuando hay destino: abrir es showModal(), cerrar lo desmonta.
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Hecho el cambio, la tabla de atrás ya lo refleja: la fila cambia de estado o se va.
  useEffect(() => {
    if (ok) onCerrar();
  }, [ok, onCerrar]);

  const titulo = eliminar
    ? "Eliminar centro"
    : accion === "reactivar"
      ? "Reincorporar el centro"
      : "Dar de baja al centro";

  const tituloId = "dialogo-centro-titulo";
  const cuerpoId = "dialogo-centro-cuerpo";

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      aria-describedby={cuerpoId}
      onClose={onCerrar}
      onClick={(e) => {
        // Un clic en el velo tiene como blanco el propio <dialog>.
        if (e.target === ref.current) onCerrar();
      }}
      className="m-auto w-[30rem] max-w-[calc(100vw-2rem)] rounded-grande border-0 bg-white p-5 text-tinta shadow-[0_24px_60px_-12px_rgba(9,20,38,.45)] backdrop:bg-tinta/45"
    >
      <h2 id={tituloId} className="text-[15px] font-bold">
        {titulo}
      </h2>

      <div className="mt-3">
        <div className="text-[13px] font-bold">{hospital.nombre}</div>
        <div className="text-[11px] text-tinta3">
          {hospital.tipo === "ambulatorio"
            ? "Ambulatorio"
            : hospital.tipo === "otro"
              ? "Núcleo médico"
              : "Hospital"}
          {hospital.ubicacion ? ` · ${hospital.ubicacion}` : ""}
        </div>
      </div>

      <p id={cuerpoId} className="mt-3 text-[13px] text-tinta2">
        {eliminar ? (
          <>
            No tiene cargas ni reportes: no se pierde historia. Se elimina también su acceso
            {usuario ? (
              <>
                {" "}
                <span className="font-semibold text-tinta">{usuario}</span>
              </>
            ) : (
              " (no tenía)"
            )}
            . Esta acción no tiene vuelta atrás.
          </>
        ) : accion === "reactivar" ? (
          <>
            Vuelve al panel y al consolidado <span className="font-semibold text-tinta">en todos
            los períodos</span>, y su acceso{usuario ? ` ${usuario}` : ""} queda habilitado de nuevo.
          </>
        ) : (
          <>
            {datos.reportes > 0 ? (
              <>
                Tiene{" "}
                <span className="font-semibold text-tinta">
                  {datos.reportes} {datos.reportes === 1 ? "reporte" : "reportes"} y{" "}
                  {datos.consultas} {datos.consultas === 1 ? "fila" : "filas"} de consultas
                </span>{" "}
                ({datos.periodo}). Sale del consolidado y del PDF{" "}
                <span className="font-semibold text-tinta">en todos los períodos</span>, incluidos
                los ya publicados.{" "}
              </>
            ) : (
              <>No tiene cargas ni reportes. Sale del panel y del consolidado. </>
            )}
            Su acceso{usuario ? ` ${usuario}` : ""} queda bloqueado.{" "}
            <span className="font-semibold text-tinta">No se borra nada</span>: reincorporarlo lo
            devuelve.
          </>
        )}
      </p>

      {eliminar && (
        <form action={accionBorra} className="mt-4">
          <input type="hidden" name="hospitalId" value={hospital.id} />
          <label
            htmlFor="clave-admin"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2"
          >
            Tu clave de acceso
          </label>
          <input
            id="clave-admin"
            name="clave"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Confirma que eres tú"
            className="w-full text-[13px]"
          />
          {error && <p className="mt-2 text-[12px] font-semibold text-fecha">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold text-tinta2 hover:bg-papel"
            >
              Cancelar
            </button>
            <button
              disabled={pendiente}
              className="h-9 rounded-chico border border-fecha/40 px-4 text-[13px] font-semibold text-fecha hover:bg-fecha/10 disabled:opacity-60"
            >
              {pendiente ? "Eliminando…" : "Eliminar centro"}
            </button>
          </div>
        </form>
      )}

      {!eliminar && (
        <form action={accionBaja} className="mt-4">
          <input type="hidden" name="hospitalId" value={hospital.id} />
          <input type="hidden" name="activar" value={accion === "reactivar" ? "1" : "0"} />
          {error && <p className="mb-2 text-[12px] font-semibold text-fecha">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold text-tinta2 hover:bg-papel"
            >
              Cancelar
            </button>
            <button
              disabled={pendiente}
              className={
                accion === "reactivar"
                  ? "h-9 rounded-chico bg-banda px-4 text-[13px] font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
                  : "h-9 rounded-chico border border-fecha/40 px-4 text-[13px] font-semibold text-fecha hover:bg-fecha/10 disabled:opacity-60"
              }
            >
              {pendiente
                ? "Guardando…"
                : accion === "reactivar"
                  ? "Reincorporar"
                  : "Dar de baja"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
