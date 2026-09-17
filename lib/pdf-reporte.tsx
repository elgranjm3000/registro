import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Page, Text, View, StyleSheet, Svg, Path, Image, Font } from "@react-pdf/renderer";
import type { DatosReporte } from "./reporte-datos";
import { formatoMilitar } from "./fechas";

// Nunca dividir palabras con guiones: cada palabra queda completa en su línea.
Font.registerHyphenationCallback((word) => [word]);

// Formato numérico del formato oficial: 25.602
const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const AZUL = "#0e2a52";
const ROJO = "#c0392b";
const COL = { Militar: "#4caf6d", Afiliado: "#2f9ec7", PNA: "#d64541" };
const GRIS = "#8593a8";

const ACTIVIDADES_PDF = [
  ["Consultas", "Consultas"],
  ["intervenciones", "Intervenciones Qx"],
  ["hospitalizaciones", "Hospitalizaciones"],
] as const;

const cacheLogos = new Map<string, string>();
function logo(nombre: string): string {
  if (!cacheLogos.has(nombre)) {
    const buf = readFileSync(join(process.cwd(), "public", "logos", `${nombre}.png`));
    cacheLogos.set(nombre, `data:image/png;base64,${buf.toString("base64")}`);
  }
  return cacheLogos.get(nombre)!;
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 28, paddingVertical: 24, fontSize: 9, fontFamily: "Helvetica", color: "#16233b" },
  membrete: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: AZUL, paddingBottom: 6 },
  membreteTxt: { textAlign: "center", fontSize: 9, fontWeight: 700, color: AZUL, width: "33%" },
  fuente: { marginTop: 4, fontSize: 7, color: GRIS },
  banda: { marginTop: 10, backgroundColor: "#dce7f5", paddingVertical: 8, textAlign: "center" },
  bandaTitulo: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  bandaFechas: { fontSize: 10, fontWeight: 700, color: ROJO, marginTop: 2 },
  panel: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14, borderWidth: 1, borderColor: "rgba(14,42,82,.4)", padding: 14, gap: 30 },
  totalBox: { backgroundColor: "#dce7f5", paddingVertical: 6, paddingHorizontal: 18, alignItems: "center" },
  totalLbl: { fontSize: 8, fontWeight: 700, color: AZUL, textTransform: "uppercase" },
  totalNum: { fontSize: 22, fontWeight: 700, marginTop: 1 },
  leyenda: { marginTop: 10, gap: 4 },
  leyendaFila: { flexDirection: "row", alignItems: "center", gap: 6, fontSize: 9, fontWeight: 700 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  h3: { fontSize: 10, fontWeight: 700, marginTop: 16, marginBottom: 4, textTransform: "uppercase" },
  th: { backgroundColor: "#dce7f5", fontWeight: 700, padding: 4, borderWidth: 1, borderColor: "#44536b", fontSize: 8 },
  bandaTabla: { backgroundColor: AZUL, color: "#ffffff", fontWeight: 700, fontSize: 9, textTransform: "uppercase", textAlign: "center", paddingVertical: 4, borderWidth: 1, borderColor: "#44536b", letterSpacing: 1 },
  filaZebra: { backgroundColor: "#f2f6fb" },
  td: { padding: 3.5, borderWidth: 1, borderColor: "#44536b", fontSize: 8 },
  tdR: { padding: 3.5, borderWidth: 1, borderColor: "#44536b", fontSize: 8, textAlign: "right" },
  filaTotal: { backgroundColor: "#dce7f5", fontWeight: 700 },
  vacio: { padding: 8, textAlign: "center", color: GRIS, borderWidth: 1, borderColor: "#44536b" },
});

// Segmento de dona entre dos ángulos (grados, 0 = arriba)
function segmentoDona(cx: number, cy: number, rExt: number, rInt: number, a0: number, a1: number) {
  const rad = (a: number) => ((a - 90) * Math.PI) / 180;
  const p = (r: number, a: number) => `${cx + r * Math.cos(rad(a))} ${cy + r * Math.sin(rad(a))}`;
  const grande = a1 - a0 > 180 ? 1 : 0;
  return `M ${p(rExt, a0)} A ${rExt} ${rExt} 0 ${grande} 1 ${p(rExt, a1)} L ${p(rInt, a1)} A ${rInt} ${rInt} 0 ${grande} 0 ${p(rInt, a0)} Z`;
}

function Dona({ cat, total, etiqueta }: { cat: DatosReporte["cat"]; total: number; etiqueta: string }) {
  const segmentos = (["Militar", "Afiliado", "PNA"] as const).map((k) => ({ k, v: cat[k], color: COL[k] }))
    .filter((x) => x.v > 0);
  let a = 0;
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  return (
    <Svg width={190} height={190} viewBox="0 0 200 200">
      {total === 0 ? (
        <Path d="" />
      ) : segmentos.length === 1 ? (
        <>
          <Path d={segmentoDona(100, 100, 88, 54, 0, 359.99)} fill={segmentos[0].color} />
          <Text
            x={100}
            y={74}
            fill="#ffffff"
            style={{ fontSize: 13, fontWeight: 700, textAnchor: "middle" }}
          >
            {Math.round((segmentos[0].v / total) * 100)}%
          </Text>
        </>
      ) : (
        segmentos.map((x) => {
          const barrido = (x.v / total) * 360;
          const inicio = a;
          const d = segmentoDona(100, 100, 88, 54, inicio, inicio + barrido);
          a += barrido;
          const ang = rad(inicio + barrido / 2);
          const rx = 100 + 71 * Math.cos(ang);
          const ry = 100 + 71 * Math.sin(ang);
          return (
            <>
              <Path key={x.k} d={d} fill={x.color} />
              <Text
                key={`${x.k}-pct`}
                x={rx}
                y={ry + 4}
                fill="#ffffff"
                style={{ fontSize: 12, fontWeight: 700, textAnchor: "middle" }}
              >
                {Math.round((x.v / total) * 100)}%
              </Text>
            </>
          );
        })
      )}
      {/* Centro de la dona: TOTAL / SERVICIO / cifra — como el formato oficial */}
      <Text x={100} y={92} fill="#16233b" style={{ fontSize: 10, fontWeight: 700, textAnchor: "middle" }}>
        TOTAL
      </Text>
      <Text x={100} y={104} fill="#16233b" style={{ fontSize: etiqueta.length > 12 ? 7.5 : 9, fontWeight: 700, textAnchor: "middle" }}>
        {etiqueta}
      </Text>
      <Text x={100} y={122} fill="#16233b" style={{ fontSize: 15, fontWeight: 700, textAnchor: "middle" }}>
        {fmt(total)}
      </Text>
    </Svg>
  );
}

export function DocumentoReporte({ d }: { d: DatosReporte }) {
  const porTipo = d.tipo === "todos";

  return (
    <Document
      title={`Reporte ${d.tituloTipo} — semana ${d.semana}`}
      author="Sala Situacional DIGESALUD"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.membrete}>
          <Text style={[s.membreteTxt, { fontSize: 11 }]}>REPÚBLICA BOLIVARIANA{"\n"}DE VENEZUELA</Text>
          <View style={{ width: 1, alignSelf: "stretch", backgroundColor: "rgba(14,42,82,.35)" }} />
          <Text style={[s.membreteTxt, { fontSize: 11 }]}>MINISTERIO DEL PODER POPULAR{"\n"}PARA LA DEFENSA</Text>
        </View>
        <Text style={s.fuente}>{d.nombreHospital}</Text>

        <View style={s.banda}>
          <Text style={s.bandaTitulo}>Distribución de {d.tituloTipo} en la Red de Salud Militar</Text>
          <Text style={s.bandaFechas}>
            Desde el {formatoMilitar(d.semana)} hasta el {formatoMilitar(d.semanaHasta)}
          </Text>
        </View>

        <View style={s.panel}>
          {porTipo ? (
            (["consultas", "intervenciones", "hospitalizaciones"] as const).map((tt) => {
              const titulo =
                tt === "consultas" ? "Consultas" : tt === "intervenciones" ? "Intervenciones Qx" : "Hospitalizaciones";
              const c = d.porTipo[tt];
              return (
                <View key={tt} style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: ROJO, textTransform: "uppercase" }}>
                    {titulo}
                  </Text>
                  <Dona cat={c} total={c.total} etiqueta={titulo} />
                  <View style={[s.leyenda, { flexDirection: "row", gap: 10 }]}>
                    {(["Militar", "Afiliado", "PNA"] as const).map((k) => (
                      <View key={k} style={s.leyendaFila}>
                        <View style={[s.swatch, { backgroundColor: COL[k] }]} />
                        <Text>{fmt(c[k])}</Text>
                        <Text style={{ color: GRIS }}>
                          ({c.total ? Math.round((c[k] / c.total) * 100) : 0}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={[s.totalBox, { marginTop: 6, paddingVertical: 6, paddingHorizontal: 18 }]}>
                    <Text style={s.totalLbl}>Total</Text>
                    <Text style={[s.totalNum, { fontSize: 22 }]}>{fmt(c.total)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: "center" }}>
              <Dona cat={d.cat} total={d.granTotal} etiqueta={d.tituloTipo} />
              <View style={[s.leyenda, { flexDirection: "row", gap: 18 }]}>
                {(["Militar", "Afiliado", "PNA"] as const).map((k) => (
                  <View key={k} style={s.leyendaFila}>
                    <View style={[s.swatch, { backgroundColor: COL[k] }]} />
                    <Text>{k.toUpperCase()}</Text>
                    <Text>{fmt(d.cat[k])}</Text>
                    <Text style={{ color: GRIS }}>
                      ({d.granTotal ? Math.round((d.cat[k] / d.granTotal) * 100) : 0}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Resumen por centro */}
        <View>
          {/* Banda de título + encabezados: se repiten en cada salto de página */}
          <View fixed wrap={false}>
            <Text style={s.bandaTabla}>
              {d.hospitalFiltro === "todos" ? "Resumen por centro de salud" : d.nombreHospital}
            </Text>
            <View style={{ flexDirection: "row" }}>
              <Text style={[s.th, { width: 24, textAlign: "center" }]}>Nº</Text>
              <Text style={[s.th, { flex: 1 }]}>CENTRO DE SALUD</Text>
              {porTipo ? (
                <>
                  <Text style={[s.th, { width: 70, textAlign: "right" }]}>CONSULTAS</Text>
                  <Text style={[s.th, { width: 100, textAlign: "right" }]}>INTERVENCIONES QX</Text>
                  <Text style={[s.th, { width: 90, textAlign: "right" }]}>HOSPITALIZACIONES</Text>
                </>
              ) : (
                <>
                  <Text style={[s.th, { width: 60, textAlign: "right" }]}>MILITAR</Text>
                  <Text style={[s.th, { width: 60, textAlign: "right" }]}>AFILIADO</Text>
                  <Text style={[s.th, { width: 50, textAlign: "right" }]}>PNA</Text>
                </>
              )}
              <Text style={[s.th, { width: 55, textAlign: "right" }]}>TOTAL</Text>
            </View>
          </View>
          {d.centros.map((f, i) => (
            <View key={f.id} style={[{ flexDirection: "row" }, ...(i % 2 === 1 ? [s.filaZebra] : [])]}>
              <Text style={[s.td, { width: 24, textAlign: "center" }]}>{i + 1}</Text>
              <Text style={[s.td, { flex: 1 }]}>{f.nombre}, {f.ubicacion}</Text>
              {porTipo ? (
                <>
                  <Text style={[s.tdR, { width: 70 }]}>{fmt(f.consultas)}</Text>
                  <Text style={[s.tdR, { width: 100 }]}>{fmt(f.intervenciones)}</Text>
                  <Text style={[s.tdR, { width: 90 }]}>{fmt(f.hospitalizaciones)}</Text>
                </>
              ) : (
                <>
                  <Text style={[s.tdR, { width: 60 }]}>{fmt(f.militar)}</Text>
                  <Text style={[s.tdR, { width: 60 }]}>{fmt(f.afiliado)}</Text>
                  <Text style={[s.tdR, { width: 50 }]}>{fmt(f.pna)}</Text>
                </>
              )}
              <Text style={[s.tdR, { width: 55, fontWeight: 700 }]}>
                {fmt(f.consultas + f.intervenciones + f.hospitalizaciones)}
              </Text>
            </View>
          ))}
          <View style={[{ flexDirection: "row" }, s.filaTotal]}>
            <Text style={[s.td, { width: 24, textAlign: "center" }]} />
            <Text style={[s.td, { flex: 1, fontWeight: 700 }]}>TOTAL</Text>
            {porTipo ? (
              <>
                <Text style={[s.tdR, { width: 70, fontWeight: 700 }]}>
                  {d.centros.reduce((a, f) => a + f.consultas, 0)}
                </Text>
                <Text style={[s.tdR, { width: 100, fontWeight: 700 }]}>
                  {d.centros.reduce((a, f) => a + f.intervenciones, 0)}
                </Text>
                <Text style={[s.tdR, { width: 90, fontWeight: 700 }]}>
                  {d.centros.reduce((a, f) => a + f.hospitalizaciones, 0)}
                </Text>
              </>
            ) : (
              <>
                <Text style={[s.tdR, { width: 60, fontWeight: 700 }]}>{d.cat.Militar}</Text>
                <Text style={[s.tdR, { width: 60, fontWeight: 700 }]}>{d.cat.Afiliado}</Text>
                <Text style={[s.tdR, { width: 50, fontWeight: 700 }]}>{d.cat.PNA}</Text>
              </>
            )}
            <Text style={[s.tdR, { width: 55, fontWeight: 700 }]}>{d.granTotal}</Text>
          </View>
        </View>

        {/* Detalle por especialidad: una tabla por actividad */}
        {porTipo
          ? ACTIVIDADES_PDF.map(([clave, titulo]) => (
              <View key={clave} style={{ marginTop: 14 }}>
                <TablaDetallePdf titulo={titulo} filas={d.detalle.filter((x) => x.tipo === titulo)} conCentro={d.hospitalFiltro === "todos"} />
              </View>
            ))
          : (
            <View style={{ marginTop: 14 }}>
              <TablaDetallePdf
                titulo={`Detalle de ${d.tituloTipo.toLowerCase()}`}
                filas={d.detalle}
                conCentro={d.hospitalFiltro === "todos"}
              />
            </View>
          )}
        <Text
          fixed
          style={{ position: "absolute", bottom: 14, left: 28, right: 28, fontSize: 7, color: GRIS, textAlign: "center" }}
          render={({ pageNumber, totalPages }) =>
            `FUENTE: Sala Situacional / DIGESALUD · Semana del ${formatoMilitar(d.semana)} al ${formatoMilitar(d.semanaHasta)} · Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

function TablaDetallePdf({
  titulo,
  filas,
  conCentro,
}: {
  titulo: string;
  filas: DatosReporte["detalle"];
  conCentro: boolean;
}) {
  if (filas.length === 0)
    return <Text style={s.vacio}>Sin detalle cargado para esta actividad.</Text>;
  return (
    <View>
      {/* Banda de título + encabezados: se repiten en cada salto de página */}
      <View fixed wrap={false}>
        <Text style={s.bandaTabla}>{titulo}</Text>
        <View style={{ flexDirection: "row" }}>
          <Text style={[s.th, { width: 24, textAlign: "center" }]}>Nº</Text>
          {conCentro && <Text style={[s.th, { flex: 1.2 }]}>CENTRO</Text>}
          <Text style={[s.th, { flex: 1 }]}>ESPECIALIDAD</Text>
          <Text style={[s.th, { width: 55, textAlign: "right" }]}>MILITAR</Text>
          <Text style={[s.th, { width: 55, textAlign: "right" }]}>AFILIADO</Text>
          <Text style={[s.th, { width: 45, textAlign: "right" }]}>PNA</Text>
          <Text style={[s.th, { width: 50, textAlign: "right" }]}>TOTAL</Text>
        </View>
      </View>
      {filas.map((x, i) => (
        <View key={i} style={[{ flexDirection: "row" }, ...(i % 2 === 1 ? [s.filaZebra] : [])]}>
          <Text style={[s.td, { width: 24, textAlign: "center" }]}>{i + 1}</Text>
          {conCentro && <Text style={[s.td, { flex: 1.2 }]}>{x.hospital}</Text>}
          <Text style={[s.td, { flex: 1 }]}>{x.especialidad}</Text>
          <Text style={[s.tdR, { width: 55 }]}>{fmt(x.Militar)}</Text>
          <Text style={[s.tdR, { width: 55 }]}>{fmt(x.Afiliado)}</Text>
          <Text style={[s.tdR, { width: 45 }]}>{fmt(x.PNA)}</Text>
          <Text style={[s.tdR, { width: 50, fontWeight: 700 }]}>
            {fmt(x.Militar + x.Afiliado + x.PNA)}
          </Text>
        </View>
      ))}
      <View style={[{ flexDirection: "row" }, s.filaTotal]}>
        <Text style={[s.td, { width: 24, textAlign: "center" }]} />
        <Text style={[s.td, { flex: 1, fontWeight: 700 }]}>TOTAL</Text>
        {conCentro && <Text style={[s.td, { flex: 1.2 }]} />}
        <Text style={[s.tdR, { width: 55, fontWeight: 700 }]}>
          {fmt(filas.reduce((a, x) => a + x.Militar, 0))}
        </Text>
        <Text style={[s.tdR, { width: 55, fontWeight: 700 }]}>
          {fmt(filas.reduce((a, x) => a + x.Afiliado, 0))}
        </Text>
        <Text style={[s.tdR, { width: 45, fontWeight: 700 }]}>
          {fmt(filas.reduce((a, x) => a + x.PNA, 0))}
        </Text>
        <Text style={[s.tdR, { width: 50, fontWeight: 700 }]}>
          {fmt(filas.reduce((a, x) => a + x.Militar + x.Afiliado + x.PNA, 0))}
        </Text>
      </View>
    </View>
  );
}

