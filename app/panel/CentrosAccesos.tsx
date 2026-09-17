"use client";

import { useActionState } from "react";
import type { Hospital, Usuario } from "@/lib/db/schema";
import { accionCambiarClaveCentro, type EstadoForm } from "@/lib/actions";

function FilaCentro({
  hospital,
  usuario,
}: {
  hospital: Hospital;
  usuario: Usuario | undefined;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(
    accionCambiarClaveCentro,
    {},
  );

  return (
    <tr className="border-b border-bordesuave last:border-0">
      <td className="px-5 py-2.5">
        <div className="font-semibold">{hospital.nombre}</div>
        <div className="text-[11px] text-tinta3">{hospital.ubicacion}</div>
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
}: {
  centros: Hospital[];
  usuarios: Usuario[];
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-1 text-[13px] font-bold uppercase tracking-wider text-tinta2">
        Centros de salud y accesos
      </h2>
      <p className="mb-3 text-[13px] text-tinta2">
        {centros.length} centros registrados. Cambia la clave de acceso de cada uno cuando lo
        necesites (mínimo 6 caracteres).
      </p>
      <div className="overflow-x-auto rounded-grande bg-white shadow-[var(--elev)]">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-borde bg-[#e8eef7] text-[11px] uppercase tracking-wider text-tinta2">
              <th className="px-5 py-2.5 text-left font-semibold">Centro</th>
              <th className="px-2 py-2.5 text-left font-semibold">Usuario</th>
              <th className="px-5 py-2.5 text-right font-semibold">Clave de acceso</th>
            </tr>
          </thead>
          <tbody>
            {centros.map((h) => (
              <FilaCentro
                key={h.id}
                hospital={h}
                usuario={usuarios.find((u) => u.hospitalId === h.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
