"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import type { Hospital, Usuario } from "@/lib/db/schema";
import DialogoCentro, { type AccionCentro, type DatosCentro, type Destino } from "./DialogoCentro";
import {
  accionCambiarClaveCentro,
  accionCrearHospital,
  accionRenombrarHospital,
  type EstadoCentro,
  type EstadoForm,
} from "@/lib/actions";

const ETIQUETA_TIPO = {
  hospital: "Hospital",
  ambulatorio: "Ambulatorio",
  otro: "Núcleo médico",
} as const;

// Clave sugerida para el centro nuevo: 10 caracteres sin I/O/0/1 — se dicta por
// teléfono o se copia a mano sin confusiones. 256 es múltiplo de 32, así que el
// reparto sobre el alfabeto sale parejo.
function claveSugerida() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

// Alta de un centro en la red. Son dos actos y el formulario los hace uno solo:
// sin cuenta de acceso, un centro no puede reportar nunca.
function AgregarCentro() {
  const [estado, accion, pendiente] = useActionState<EstadoCentro, FormData>(accionCrearHospital, {});
  const clave = useRef<HTMLInputElement>(null);

  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2";
  const campo =
    "h-9 rounded-chico border border-borde bg-white px-2.5 text-[13px] text-tinta focus:border-banda focus:outline-none";

  return (
    <form
      action={accion}
      className="mt-4 rounded-grande border border-bordesuave bg-white p-4 shadow-[var(--elev)]"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[13px] font-bold">Agregar centro de salud</span>
        <span className="text-[12px] text-tinta2">
          Se registra junto con su acceso. Aparecerá en “Sin reportar” hasta que cargue sus cifras.
        </span>
      </div>

      {/* key = id del centro creado: al dar de alta, los campos se vacían solos. */}
      <div key={estado.key ?? 0} className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className={label} htmlFor="centro-nombre">
            Nombre
          </label>
          <input
            id="centro-nombre"
            name="nombre"
            required
            minLength={3}
            placeholder='HOSPITAL MILITAR TIPO IV "…"'
            className={`${campo} w-80`}
          />
        </div>
        <div>
          <label className={label} htmlFor="centro-tipo">
            Tipo
          </label>
          <select id="centro-tipo" name="tipo" defaultValue="hospital" className={campo}>
            <option value="hospital">Hospital</option>
            <option value="ambulatorio">Ambulatorio</option>
            <option value="otro">Núcleo médico</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="centro-ubicacion">
            Ubicación
          </label>
          <input
            id="centro-ubicacion"
            name="ubicacion"
            placeholder="CIUDAD, EDO."
            className={`${campo} w-52`}
          />
        </div>
        <div>
          <label className={label} htmlFor="centro-clave">
            Clave de acceso
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={clave}
              id="centro-clave"
              name="clave"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className={`${campo} w-44`}
            />
            <button
              type="button"
              onClick={() => {
                if (clave.current) clave.current.value = claveSugerida();
              }}
              className="h-9 shrink-0 rounded-chico border border-borde px-3 text-[12px] font-semibold text-banda hover:bg-papel"
            >
              Generar
            </button>
          </div>
        </div>
        <button
          disabled={pendiente}
          className="h-9 rounded-chico bg-banda px-5 text-[13px] font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
        >
          {pendiente ? "Agregando…" : "+ Agregar centro"}
        </button>
      </div>

      {estado.ok && (
        <p className="mt-3 rounded-medio bg-verifica/10 px-4 py-3 text-[13px] font-semibold text-verifica">
          {estado.ok}
        </p>
      )}
      {estado.error && (
        <p className="mt-3 rounded-medio bg-fecha/10 px-4 py-3 text-[13px] font-semibold text-fecha">
          {estado.error}
        </p>
      )}
    </form>
  );
}

function FilaCentro({
  hospital,
  usuario,
  conDatos,
  onAccion,
}: {
  hospital: Hospital;
  usuario: Usuario | undefined;
  conDatos: boolean;
  onAccion: (accion: AccionCentro) => void;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(
    accionCambiarClaveCentro,
    {},
  );
  const [estadoNom, accionNom, pendienteNom] = useActionState<EstadoForm, FormData>(
    accionRenombrarHospital,
    {},
  );
  const [editando, setEditando] = useState(false);

  return (
    <tr className="border-b border-bordesuave last:border-0">
      <td className="px-5 py-2.5">
        {editando ? (
          <form action={accionNom} className="flex items-center gap-2">
            <input type="hidden" name="hospitalId" value={hospital.id} />
            <input name="nombre" defaultValue={hospital.nombre} className="w-64 text-[12px]" required />
            <button
              disabled={pendienteNom}
              className="h-7 rounded-chico bg-banda px-2.5 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="h-7 rounded-chico border border-borde px-2.5 text-[11px] font-semibold text-tinta2"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {!hospital.activo && (
                <span className="rounded-full bg-control px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tinta3">
                  Inactivo
                </span>
              )}
              <span className={`font-semibold ${hospital.activo ? "" : "text-tinta2"}`}>
                {hospital.nombre}
              </span>
              <button
                type="button"
                onClick={() => setEditando(true)}
                title="Renombrar centro"
                className="text-[11px] font-semibold text-banda hover:underline"
              >
                editar
              </button>
              <span aria-hidden className="text-tinta3">
                ·
              </span>
              <button
                type="button"
                onClick={() => onAccion(hospital.activo ? "desactivar" : "reactivar")}
                title={
                  hospital.activo
                    ? "Sale del consolidado y bloquea su acceso. No borra nada."
                    : "Vuelve al consolidado y habilita su acceso."
                }
                className="text-[11px] font-semibold text-tinta2 hover:underline"
              >
                {hospital.activo ? "dar de baja" : "reincorporar"}
              </button>
              {/* Eliminar solo existe cuando de verdad es la herramienta: sin historia que perder. */}
              {!conDatos && (
                <>
                  <span aria-hidden className="text-tinta3">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => onAccion("eliminar")}
                    title="Nunca debió existir. No tiene datos cargados."
                    className="text-[11px] font-semibold text-fecha hover:underline"
                  >
                    eliminar
                  </button>
                </>
              )}
            </div>
            <div className="text-[11px] text-tinta3">
              {ETIQUETA_TIPO[hospital.tipo] ?? ETIQUETA_TIPO.hospital}
              {hospital.ubicacion ? ` · ${hospital.ubicacion}` : ""}
            </div>
            {estadoNom.ok && <div className="text-[11px] font-semibold text-verifica">{estadoNom.ok}</div>}
            {estadoNom.error && <div className="text-[11px] font-semibold text-fecha">{estadoNom.error}</div>}
          </>
        )}
      </td>
      <td className="px-2 py-2.5 text-[12px] text-tinta2">
        {usuario?.email ?? <span className="text-fecha">sin usuario</span>}
      </td>
      <td className="px-5 py-2.5">
        {usuario ? (
          <form action={accion} className="flex flex-wrap items-center justify-end gap-2">
            <input type="hidden" name="usuarioId" value={usuario.id} />
            <input
              name="clave"
              type="text"
              placeholder="Nueva clave (mín. 6)"
              minLength={6}
              required
              className="w-44 text-[12px]"
            />
            <button
              disabled={pendiente}
              className="h-8 rounded-chico bg-banda px-3 text-[12px] font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
            >
              {pendiente ? "…" : "Cambiar"}
            </button>
            {estado.ok && <span className="text-[11px] font-semibold text-verifica">{estado.ok}</span>}
            {estado.error && <span className="text-[11px] font-semibold text-fecha">{estado.error}</span>}
          </form>
        ) : (
          <span className="block text-right text-[11px] text-tinta3">—</span>
        )}
      </td>
    </tr>
  );
}

export default function CentrosAccesos({
  centros,
  usuarios,
  datos,
}: {
  centros: Hospital[];
  usuarios: Usuario[];
  datos: Record<number, DatosCentro>;
}) {
  // Un solo diálogo para toda la sección: la fila sólo dice a quién y qué.
  const [destino, setDestino] = useState<Destino | null>(null);
  const cerrar = useCallback(() => setDestino(null), []);

  const vacio: DatosCentro = { reportes: 0, consultas: 0, periodo: "" };

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-[13px] font-bold uppercase tracking-wider text-tinta2">
        Centros de salud y accesos
      </h2>
      <p className="mb-3 text-[13px] text-tinta2">
        {centros.length} centros registrados. Agrega los que se incorporen a la red, cambia la
        clave de acceso de cada uno (mínimo 6 caracteres) y da de baja a los que salgan.
      </p>
      <AgregarCentro />
      <div className="mt-4 overflow-x-auto rounded-grande bg-white shadow-[var(--elev)]">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-borde bg-[#e8eef7] text-[11px] uppercase tracking-wider text-tinta2">
              <th className="px-5 py-2.5 text-left font-semibold">Centro</th>
              <th className="px-2 py-2.5 text-left font-semibold">Usuario</th>
              <th className="px-5 py-2.5 text-right font-semibold">Clave de acceso</th>
            </tr>
          </thead>
          <tbody>
            {centros.map((h) => {
              const u = usuarios.find((x) => x.hospitalId === h.id);
              const d = datos[h.id] ?? vacio;
              return (
                <FilaCentro
                  key={h.id}
                  hospital={h}
                  usuario={u}
                  conDatos={d.reportes > 0 || d.consultas > 0}
                  onAccion={(accion) =>
                    setDestino({ hospital: h, usuario: u?.email ?? null, datos: d, accion })
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {destino && <DialogoCentro destino={destino} onCerrar={cerrar} />}
    </section>
  );
}
