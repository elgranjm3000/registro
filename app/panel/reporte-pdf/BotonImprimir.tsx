"use client";

import { useEffect } from "react";

// Abre el diálogo de impresión al entrar (→ "Guardar como PDF")
export default function BotonImprimir() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="h-9 rounded-chico bg-banda px-5 text-[13px] font-semibold text-white hover:bg-[#153a6e]"
    >
      🖨 Imprimir / Guardar PDF
    </button>
  );
}
