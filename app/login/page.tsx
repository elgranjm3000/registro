"use client";

import { useActionState } from "react";
import { accionLogin, type EstadoForm } from "@/lib/actions";

export default function Login() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(accionLogin, {});
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-medio bg-banda text-lg font-bold text-white">
            DS
          </div>
          <h1 className="text-[22px] font-bold leading-tight">Sala Situacional</h1>
          <p className="mt-1 text-[13px] font-medium text-tinta3">
            DIGESALUD · Red de Salud Militar
          </p>
        </div>

        <form
          action={accion}
          className="rounded-grande bg-white p-6 shadow-[var(--elev)]"
        >
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
            Correo
          </label>
          <input name="email" type="email" required className="mb-4 w-full" autoComplete="username" />
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-tinta2">
            Clave
          </label>
          <input
            name="clave"
            type="password"
            required
            className="mb-5 w-full"
            autoComplete="current-password"
          />
          {estado.error && (
            <p className="mb-4 rounded-chico bg-fecha/10 px-3 py-2 text-[13px] font-medium text-fecha">
              {estado.error}
            </p>
          )}
          <button
            disabled={pendiente}
            className="h-10 w-full rounded-chico bg-banda font-semibold text-white hover:bg-[#153a6e] disabled:opacity-60"
          >
            {pendiente ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
