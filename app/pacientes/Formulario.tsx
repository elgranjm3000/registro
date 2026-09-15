"use client";

import { useActionState } from "react";
import { accionRegistrarPaciente, type EstadoForm } from "@/lib/actions";

const hoy = () => new Date().toISOString().slice(0, 10);

export default function FormularioPaciente() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(
    accionRegistrarPaciente,
    {},
  );

  const campo =
    "w-full";
  const etiqueta =
    "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2";

  return (
    <form action={accion} className="h-fit rounded-grande bg-white p-5 shadow-[var(--elev)]">
      <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-tinta2">
        Nuevo paciente
      </h2>

      <label className={etiqueta}>Nombre y apellido</label>
      <input name="nombre" required className={`${campo} mb-3`} placeholder="Ej: Juan Pérez" />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className={etiqueta}>Cédula</label>
          <input name="cedula" className={campo} placeholder="V-12345678" />
        </div>
        <div>
          <label className={etiqueta}>Edad</label>
          <input name="edad" type="number" min={0} max={120} className={campo} />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className={etiqueta}>Sexo</label>
          <select name="sexo" className={campo} defaultValue="M">
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
        <div>
          <label className={etiqueta}>Fecha atención</label>
          <input name="fecha" type="date" required defaultValue={hoy()} className={campo} />
        </div>
      </div>

      <label className={etiqueta}>Categoría</label>
      <select name="categoria" required className={`${campo} mb-3`} defaultValue="">
        <option value="" disabled>
          Seleccionar…
        </option>
        <option value="militar">Militar</option>
        <option value="afiliado">Afiliado</option>
        <option value="pna">PNA</option>
      </select>

      <label className={etiqueta}>Actividad</label>
      <select name="actividad" required className={`${campo} mb-4`} defaultValue="">
        <option value="" disabled>
          Seleccionar…
        </option>
        <option value="consultas">Consulta</option>
        <option value="intervenciones">Intervención</option>
        <option value="hospitalizaciones">Hospitalización</option>
      </select>

      {estado.ok && (
        <p className="mb-3 rounded-medio bg-verifica/10 px-3 py-2 text-[12px] font-semibold text-verifica">
          {estado.ok}
        </p>
      )}
      {estado.error && (
        <p className="mb-3 rounded-medio bg-fecha/10 px-3 py-2 text-[12px] font-semibold text-fecha">
          {estado.error}
        </p>
      )}

      <button
        disabled={pendiente}
        className="h-10 w-full rounded-chico bg-banda font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
      >
        {pendiente ? "Registrando…" : "Registrar paciente"}
      </button>
    </form>
  );
}
