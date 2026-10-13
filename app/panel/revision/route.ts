import { NextResponse } from "next/server";
import { count, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportes } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";

// Firma mínima del estado de las cargas: cuántos reportes hay y cuándo se tocó el último.
// El panel la sondea en segundo plano y solo re-renderiza cuando el valor cambió,
// en vez de repetir el render completo (varias consultas) cada pocos segundos.
export async function GET() {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [fila] = await db
    .select({ total: count(), ultimo: max(reportes.actualizadoEn) })
    .from(reportes);

  return NextResponse.json(
    { rev: `${fila?.total ?? 0}·${fila?.ultimo ?? ""}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
