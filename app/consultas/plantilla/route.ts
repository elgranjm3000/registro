import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { especialidades } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";

// Plantilla demo del centro: una fila por especialidad con sus cantidades.
// La columna Especialidad lleva desplegable con todas las especialidades activas.
export async function GET() {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "centro")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const XLSX = await import("xlsx");
  const JSZip = (await import("jszip")).default;

  const esp = await db
    .select()
    .from(especialidades)
    .where(eq(especialidades.activa, true))
    .orderBy(asc(especialidades.orden), asc(especialidades.nombre));

  const lunes = new Date();
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const sem = lunes.toISOString().slice(0, 10);

  const hoja = XLSX.utils.json_to_sheet([
    { Especialidad: esp[0]?.nombre ?? "CARDIOLOGÍA", Tipo: "Consultas", Militar: 12, Afiliado: 8, PNA: 25, Semana: sem },
    { Especialidad: esp[1]?.nombre ?? "TRAUMATOLOGÍA", Tipo: "Intervenciones Qx", Militar: 5, Afiliado: 3, PNA: 10, Semana: sem },
    { Especialidad: esp[3]?.nombre ?? "ENDOCRINOLOGÍA", Tipo: "Hospitalizaciones", Militar: 4, Afiliado: 6, PNA: 9, Semana: sem },
  ]);
  hoja["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];

  // Hoja con las listas para los desplegables
  const listas = XLSX.utils.aoa_to_sheet([
    ["Especialidades", "Tipo"],
    ...Array.from({ length: Math.max(esp.length, 3) }, (_, i) => [
      esp[i]?.nombre ?? "",
      ["Consultas", "Intervenciones Qx", "Hospitalizaciones"][i] ?? "",
    ]),
  ]);
  listas["!cols"] = [{ wch: 28 }, { wch: 16 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Consultas");
  XLSX.utils.book_append_sheet(libro, listas, "Listas");

  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;

  // Inyecta el desplegable en la columna Especialidad
  const zip = await JSZip.loadAsync(buffer);
  const hojaConsultas = zip.file("xl/worksheets/sheet1.xml");
  if (hojaConsultas) {
    let xml = await hojaConsultas.async("string");
    const fin = esp.length + 1;
    const validacion =
      `<dataValidations count="2">` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="A2:A5000"><formula1>Listas!$A$2:$A$${fin}</formula1></dataValidation>` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="B2:B5000"><formula1>Listas!$B$2:$B$4</formula1></dataValidation>` +
      `</dataValidations>`;
    xml = xml.replace("</worksheet>", `${validacion}</worksheet>`);
    zip.file("xl/worksheets/sheet1.xml", xml);
  }
  const final = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(final), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-consultas.xlsx"',
    },
  });
}
