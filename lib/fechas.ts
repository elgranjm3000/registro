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
