import { NextResponse } from "next/server";

// Plantilla demo para carga masiva de pacientes por centro
export async function GET() {
  const XLSX = await import("xlsx");
  const filas = [
    {
      Nombre: "Juan Pérez",
      Cedula: "V-12345678",
      Edad: 34,
      Sexo: "M",
      Categoria: "MILITAR",
      Actividad: "Consulta",
      Fecha: "2026-09-14",
    },
    {
      Nombre: "María Rodríguez",
      Cedula: "V-87654321",
      Edad: 28,
      Sexo: "F",
      Categoria: "AFILIADO",
      Actividad: "Hospitalización",
      Fecha: "2026-09-15",
    },
    {
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
  hoja["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 6 }, { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 12 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Pacientes");
  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-pacientes.xlsx"',
    },
  });
}
