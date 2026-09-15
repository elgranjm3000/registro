import { NextResponse } from "next/server";
import { getSesion } from "@/lib/auth";

// Plantilla demo del centro: una fila por especialidad con sus cantidades
export async function GET() {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const XLSX = await import("xlsx");
  const lunes = new Date();
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const sem = lunes.toISOString().slice(0, 10);

  const hoja = XLSX.utils.json_to_sheet([
    { Especialidad: "CARDIOLOGÍA", Militar: 12, Afiliado: 8, PNA: 25, Semana: sem },
    { Especialidad: "TRAUMATOLOGÍA", Militar: 5, Afiliado: 3, PNA: 10, Semana: sem },
    { Especialidad: "ENDOCRINOLOGÍA", Militar: 4, Afiliado: 6, PNA: 9, Semana: sem },
  ]);
  hoja["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Consultas");
  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-consultas.xlsx"',
    },
  });
}
