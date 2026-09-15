import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitales } from "@/lib/db/schema";

// Plantilla del admin para cargar pacientes de todos los centros.
// Las columnas Centro, Categoría y Actividad llevan desplegables (validación de datos).
export async function GET() {
  const XLSX = await import("xlsx");
  const JSZip = (await import("jszip")).default;

  const centros = await db.select().from(hospitales).orderBy(hospitales.nombre);

  const filas = [
    {
      Centro: centros[0]?.nombre ?? "",
      Nombre: "Juan Pérez",
      Cedula: "V-12345678",
      Edad: 34,
      Sexo: "M",
      Categoria: "MILITAR",
      Actividad: "Consulta",
      Fecha: "2026-09-14",
    },
    {
      Centro: centros[0]?.nombre ?? "",
      Nombre: "María Rodríguez",
      Cedula: "V-87654321",
      Edad: 28,
      Sexo: "F",
      Categoria: "AFILIADO",
      Actividad: "Hospitalización",
      Fecha: "2026-09-15",
    },
    {
      Centro: centros[0]?.nombre ?? "",
      Nombre: "Luis Gómez",
      Cedula: "V-11223344",
      Edad: 45,
      Sexo: "M",
      Categoria: "PNA",
      Actividad: "Intervención",
      Fecha: "2026-09-16",
    },
  ];
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [
    { wch: 52 }, { wch: 24 }, { wch: 14 }, { wch: 6 }, { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
  ];

  // Hoja oculta con las listas de los desplegables
  const listas = XLSX.utils.aoa_to_sheet([
    ["Hospitales", "Categoria", "Actividad"],
    ...centros.map((c) => [c.nombre]),
    ["", "MILITAR", "Consulta"],
    ["", "AFILIADO", "Intervención"],
    ["", "PNA", "Hospitalización"],
  ]);
  listas["!cols"] = [{ wch: 52 }, { wch: 12 }, { wch: 18 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Pacientes");
  XLSX.utils.book_append_sheet(libro, listas, "Listas");

  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;

  // Inyecta los desplegables (SheetJS CE no los escribe; se agregan al XML directamente)
  const zip = await JSZip.loadAsync(buffer);
  const hojaPacientes = zip.file("xl/worksheets/sheet1.xml");
  if (hojaPacientes) {
    let xml = await hojaPacientes.async("string");
    const n = centros.length;
    const finHosp = n + 1; // hospitales: filas 2..n+1
    const catInicio = n + 2, catFin = n + 4; // categoría/actividad: filas n+2..n+4
    const validaciones = `<dataValidations count="3">` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="A2:A5000"><formula1>Listas!$A$2:$A$${finHosp}</formula1></dataValidation>` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="F2:F5000"><formula1>Listas!$B$${catInicio}:$B$${catFin}</formula1></dataValidation>` +
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="G2:G5000"><formula1>Listas!$C$${catInicio}:$C$${catFin}</formula1></dataValidation>` +
      `</dataValidations>`;
    xml = xml.replace("</worksheet>", `${validaciones}</worksheet>`);
    zip.file("xl/worksheets/sheet1.xml", xml);
  }
  const final = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(final), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-pacientes-admin.xlsx"',
    },
  });
}
