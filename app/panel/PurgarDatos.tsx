"use client";

import { accionPurgarDatos } from "@/lib/actions";

// Elimina TODA la información cargada (consultas y reportes). Acción de admin con confirmación.
export default function PurgarDatos() {
  return (
    <form
      action={accionPurgarDatos}
      onSubmit={(e) => {
        if (
          !confirm(
            "Se eliminarán TODAS las cifras y reportes cargados (incluidas las pruebas). Los centros, usuarios y especialidades se conservan. ¿Continuar?",
          )
        )
          e.preventDefault();
      }}
      className="mt-3"
    >
      <button className="rounded-chico border border-fecha/40 px-3 py-1.5 text-[12px] font-semibold text-fecha hover:bg-fecha/10">
        🗑 Eliminar toda la información cargada
      </button>
    </form>
  );
}
