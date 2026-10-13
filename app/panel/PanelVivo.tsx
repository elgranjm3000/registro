"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

// ─── Sala viva ───
// El panel no espera a un F5: sondea una firma ligera de las cargas y, cuando cambia,
// re-renderiza los Server Components. El tablero avisa *qué* llegó, para que el operador
// no vea el contenido moverse sin explicación.

const CADENCIA = 20_000; // ms entre sondeos
const DESTELLO = 6_000; // ms que queda marcada una fila recién cargada

type Fila = { id: number; hospitalId: number; actualizado: string };

type Estado = {
  activo: boolean;
  revisando: boolean;
  ultima: number | null;
  nota: string | null;
  alternar: () => void;
};

const NuevasCtx = createContext<number[]>([]);
const EstadoCtx = createContext<Estado | null>(null);

// Fila de "Reportes del periodo" que se enciende cuando su carga cambia.
// Solo el <tr> vive en el cliente; las celdas las sigue renderizando el servidor.
export function FilaViva({ id, children }: { id: number; children: React.ReactNode }) {
  const recien = useContext(NuevasCtx).includes(id);
  return (
    <tr
      data-nueva={recien ? "" : undefined}
      className={`border-b border-bordesuave transition-colors duration-700 last:border-0 ${
        recien ? "bg-verifica/[0.07] shadow-[inset_3px_0_0_var(--verifica)]" : ""
      }`}
    >
      {children}
    </tr>
  );
}

export function ProveedorVivo({
  filas,
  className,
  children,
}: {
  filas: Fila[];
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [nuevas, setNuevas] = useState<number[]>([]);
  const [nota, setNota] = useState<string | null>(null);
  const [activo, setActivo] = useState(true);
  const [revisando, setRevisando] = useState(false);
  const [ultima, setUltima] = useState<number | null>(null);
  const rev = useRef<string | null>(null);
  const previas = useRef<Map<number, string> | null>(null);
  const filasRef = useRef(filas);

  // Sondeo en segundo plano. Pausado si la pestaña está oculta (no gasta consultas
  // mientras nadie mira) y se reanuda con un chequeo inmediato al volver.
  useEffect(() => {
    if (!activo) return;
    let cancelado = false;

    async function revisar() {
      if (document.hidden) return;
      setRevisando(true);
      try {
        const r = await fetch("/panel/revision", { cache: "no-store" });
        if (cancelado) return;
        if (r.status === 401) {
          // La sesión venció: dejar que el servidor lleve al login.
          startTransition(() => router.refresh());
          return;
        }
        if (!r.ok) return;
        const { rev: nueva } = (await r.json()) as { rev: string };
        if (cancelado) return;
        setUltima(Date.now());
        if (rev.current === null) {
          rev.current = nueva; // primer sondeo: solo memoriza
          return;
        }
        if (nueva !== rev.current) {
          rev.current = nueva;
          startTransition(() => router.refresh());
        }
      } catch {
        // Sin conexión momentánea: la próxima pasada reintenta.
      } finally {
        if (!cancelado) setRevisando(false);
      }
    }

    revisar();
    const t = setInterval(revisar, CADENCIA);
    const alVolver = () => {
      if (!document.hidden) revisar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activo, router]);

  // Firma estable: solo cambia cuando de verdad cambió una carga, así el destello
  // no se corta por re-renders del propio componente.
  const firma = filas.map((f) => `${f.id}:${f.actualizado}`).join("|");
  useEffect(() => {
    filasRef.current = filas;
  }, [filas]);

  useEffect(() => {
    const actuales = filasRef.current;
    const mapa = new Map(actuales.map((f) => [f.id, f.actualizado]));
    if (previas.current === null) {
      previas.current = mapa; // montaje: nada destella
      return;
    }
    const cambiadas = actuales.filter((f) => previas.current!.get(f.id) !== f.actualizado);
    previas.current = mapa;
    if (cambiadas.length === 0) return;

    const centros = new Set(cambiadas.map((f) => f.hospitalId)).size;
    setNuevas(cambiadas.map((f) => f.id));
    setNota(
      centros === 1 ? "1 centro actualizó sus cifras" : `${centros} centros actualizaron sus cifras`,
    );
    const t = setTimeout(() => {
      setNuevas([]);
      setNota(null);
    }, DESTELLO);
    return () => clearTimeout(t);
  }, [firma]);

  const estado: Estado = {
    activo,
    revisando,
    ultima,
    nota,
    alternar: () => setActivo((a) => !a),
  };

  return (
    <EstadoCtx.Provider value={estado}>
      <NuevasCtx.Provider value={nuevas}>
        <div className={className}>{children}</div>
      </NuevasCtx.Provider>
    </EstadoCtx.Provider>
  );
}

// Indicador de estado + aviso de lo que acaba de entrar.
export function ChipVivo() {
  const estado = useContext(EstadoCtx);
  const [hace, setHace] = useState("—");

  const ultima = estado?.ultima ?? null;
  const revisando = estado?.revisando ?? false;

  // El tiempo relativo se calcula dentro del efecto, no durante el render.
  useEffect(() => {
    const calcular = () => {
      if (ultima === null) return setHace("—");
      if (revisando) return setHace("comprobando");
      setHace(`hace ${Math.max(0, Math.round((Date.now() - ultima) / 1000))} s`);
    };
    calcular();
    const t = setInterval(calcular, 1000);
    return () => clearInterval(t);
  }, [ultima, revisando]);

  if (!estado) return null;

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-live="polite"
        className="hidden min-w-[12.5rem] text-right text-[11px] font-semibold text-verifica sm:inline"
      >
        {estado.nota ?? ""}
      </span>
      <button
        type="button"
        onClick={estado.alternar}
        aria-pressed={estado.activo}
        title={
          estado.activo
            ? "Pausar la actualización automática"
            : "Reanudar la actualización automática"
        }
        className="inline-flex h-7 items-center gap-2 rounded-full border border-borde bg-white px-2.5 text-[11px] font-semibold uppercase tracking-wider text-tinta2 transition-colors duration-150 hover:bg-papel"
      >
        <span
          className={`h-[7px] w-[7px] shrink-0 rounded-full transition-colors duration-300 ${
            estado.activo ? "bg-verifica" : "bg-tinta3"
          } ${estado.activo && estado.revisando ? "animate-pulse" : ""}`}
        />
        <span>{estado.activo ? "En vivo" : "En pausa"}</span>
        <span className="font-normal normal-case tracking-normal text-tinta3">{hace}</span>
      </button>
    </div>
  );
}
