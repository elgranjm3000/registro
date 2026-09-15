import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { especialidades, hospitales } from "@/lib/db/schema";
import { getSesion } from "@/lib/auth";

// Plantilla del admin: consultas por especialidad de todos los centros.
// Desplegables en Centro, Especialidad y la semana viene en columna.
export async function GET() {
  const sesion = await getSesion();
  if (!sesion || sesion.rol !== "admin")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const XLSX = await import("xlsx");
  const JSZip = (await import("jszip")).default;

  const centros = await db.select().from(hospitales).orderBy(hospitales.nombre);
  const esp = await db
    .select()
    .from(especialidades)
    .where(eq(especialidades.activa, true))
    .orderBy(asc(especialidades.orden), asc(especialidades.nombre));

  const lunes = new Date();
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const sem = lunes.toISOString().slice(0, 10);

  const filas = [
    {
      Centro: centros[0]?.nombre ?? "",
      Especialidad: "CARDIOLOGÍA",
      Tipo: "Consulta",
      Militar: 12,
      Afiliado: 8,
      PNA: 25,
      Semana: sem,
    },
    {
      Centro: centros[0]?.nombre ?? "",
      Especialidad: "TRAUMATOLOGÍA",
      Tipo: "Intervención",
      Militar: 5,
      Afiliado: 3,
      PNA: 10,
      Semana: sem,
    },
    {
      Centro: centros[0]?.nombre ?? "",
      Especialidad: "ENDOCRINOLOGÍA",
      Tipo: "Hospitalización",
      Militar: 4,
      Afiliado: 6,
      PNA: 9,
      Semana: sem,
    },
  ];
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [{ wch: 52 }, { wch: 26 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];

  // Hoja oculta con las listas de los desplegables
  const listas = XLSX.utils.aoa_to_sheet([
    ["Hospitales", "Especialidades", "Tipo"],
    ...Array.from({ length: Math.max(centros.length, esp.length, 3) }, (_, i) => [
      centros[i]?.nombre ?? "",
      esp[i]?.nombre ?? "",
      ["Consulta", "Intervención", "Hospitalización"][i] ?? "",
    ]),
  ]);
  listas["!cols"] = [{ wch: 52 }, { wch: 26 }, { wch: 16 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Consultas");
  XLSX.utils.book_append_sheet(libro, listas, "Listas");

  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;

  // Inyecta los desplegables (SheetJS CE no los escribe)
  const zip = await JSZip.loadAsync(buffer);
  const hojaConsultas = zip.file("xl/worksheets/sheet1.xml");
  if (hojaConsultas) {
    let xml = await hojaConsultas.async("string");
    const finCentros = centros.length + 1;
    const finEsp = esp.length + 1;
    const validaciones = `<dataValidations count="3">` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="A2:A5000"><formula1>Listas!$A$2:$A$${finCentros}</formula1></dataValidation>` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="B2:B5000"><formula1>Listas!$B$2:$B$${finEsp}</formula1></dataValidation>` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="C2:C5000"><formula1>Listas!$C$2:$C$4</formula1></dataValidation>` +
      `</dataValidations>`;
    xml = xml.replace("</worksheet>", `${validaciones}</worksheet>`);
    zip.file("xl/worksheets/sheet1.xml", xml);
  }
  const final = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(final), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-consultas-admin.xlsx"',
    },
  });
}
