"use client";

import { useState } from "react";

// Imprime la vista previa del reporte (opcional; la descarga nativa es el botón principal)
export default function BotonImprimir() {
  const [pulso, setPulso] = useState(false);
  return (
    <button
      onClick={() => {
        setPulso(true);
        window.print();
        setTimeout(() => setPulso(false), 600);
      }}
      className="h-9 rounded-chico border border-borde px-4 text-[13px] font-semibold text-tinta2 hover:bg-papel"
    >
      {pulso ? "Abriendo impresión…" : "🖨 Imprimir vista"}
    </button>
  );
}
