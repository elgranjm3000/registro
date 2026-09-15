import { getSesion } from "@/lib/auth";
import { accionSalir } from "@/lib/actions";

// Firma visual: el encabezado institucional del formato oficial, en tres bloques.
export default async function Encabezado({ subtitulo }: { subtitulo: string }) {
  const sesion = await getSesion();
  return (
    <header className="border-b border-bordesuave bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-chico bg-banda font-bold text-white text-sm">
            DS
          </div>
          <div>
            <div className="text-[13px] font-bold leading-tight tracking-wide">
              DIGESALUD · Sala Situacional
            </div>
            <div className="text-[11px] font-medium text-tinta3">{subtitulo}</div>
          </div>
        </div>
        {sesion && (
          <div className="flex items-center gap-3 text-[12px]">
            <div className="text-right">
              <div className="font-semibold">{sesion.nombre}</div>
              <div className="text-tinta3 capitalize">{sesion.rol}</div>
            </div>
            <form action={accionSalir}>
              <button className="rounded-chico border border-borde px-3 py-1.5 font-medium text-tinta2 hover:bg-papel">
                Salir
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
