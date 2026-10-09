"use client";

import { useActionState } from "react";
import type { Hospital } from "@/lib/db/schema";
import { accionEliminarCargas, type EstadoForm } from "@/lib/actions";

// Eliminación selectiva de cargas: centro (o todos) + rango de fechas, con confirmación.
export default function EliminarCargas({ centros, semana }: { centros: Hospital[]; semana: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(accionEliminarCargas, {});

  const mes = semana.slice(0, 7);
  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2";

  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar las cargas del centro y periodo seleccionados? Esta acción no se puede deshacer."))
          e.preventDefault();
      }}
      className="mt-4 rounded-grande border border-bordesuave bg-white p-4 shadow-[var(--elev)]"
    >
      <div className="text-[12px] font-bold uppercase tracking-wider text-tinta2">
        Eliminar cargas (semana o mes)
      </div>
      <p className="mt-1 text-[12px] text-tinta2">
        Borra las cifras y reportes del centro y rango elegido. Para un mes completo usa del día 1 al
        último día; para una semana, del lunes al viernes.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className={label} htmlFor="del-hospital">
            Centro
          </label>
          <select id="del-hospital" name="hospital" defaultValue="todos" className="h-9 max-w-52">
            <option value="todos">Todos los centros</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="del-desde">
            Desde
          </label>
          <input id="del-desde" type="date" name="desde" defaultValue={`${mes}-01`} required />
        </div>
        <div>
          <label className={label} htmlFor="del-hasta">
            Hasta
          </label>
          <input id="del-hasta" type="date" name="hasta" defaultValue={semana} required />
        </div>
        <button
          disabled={pendiente}
          className="h-9 rounded-chico border border-fecha/40 px-4 text-[13px] font-semibold text-fecha hover:bg-fecha/10 disabled:opacity-60"
        >
          {pendiente ? "…" : "🗑 Eliminar"}
        </button>
      </div>
      {estado.ok && <p className="mt-2 text-[12px] font-semibold text-verifica">{estado.ok}</p>}
      {estado.error && <p className="mt-2 text-[12px] font-semibold text-fecha">{estado.error}</p>}
    </form>
  );
}
