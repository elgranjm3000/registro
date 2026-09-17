// Utilidades de semana reportable (lunes a viernes)
export function lunesDe(fechaISO: string): string {
  const d = new Date(fechaISO + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function viernesDe(semanaDesde: string): string {
  const d = new Date(semanaDesde + "T12:00:00");
  d.setDate(d.getDate() + 4);
  return d.toISOString().slice(0, 10);
}
export function lunesActual(): string {
  return lunesDe(new Date().toISOString().slice(0, 10));
}

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

// Formato militar venezolano: 14SEP26
export function formatoMilitar(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const dia = iso.slice(8, 10);
  const mes = MESES[Number(iso.slice(5, 7)) - 1] ?? "??";
  const anio = iso.slice(2, 4);
  return `${dia}${mes}${anio}`;
}
