import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSesion } from "@/lib/auth";
import { obtenerDatosReporte } from "@/lib/reporte-datos";
import { DocumentoReporte } from "@/lib/pdf-reporte";

export const runtime = "nodejs";
export const maxDuration = 60;

// Descarga directa del reporte en PDF (horizontal)
export async function GET(req: Request) {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const semana = sp.get("semana") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana))
    return NextResponse.json({ error: "Semana inválida" }, { status: 400 });

  const datos = await obtenerDatosReporte({
    semana,
    hospital: sp.get("hospital") ?? "todos",
    tipo: sp.get("tipo") ?? "todos",
  });

  const buffer = await renderToBuffer(<DocumentoReporte d={datos} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${datos.tipo}-${semana}.pdf"`,
    },
  });
}
