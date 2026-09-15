import React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import type { DatosReporte } from "./reporte-datos";

const AZUL = "#0e2a52";
const ROJO = "#c0392b";
const COL = { Militar: "#4caf6d", Afiliado: "#2f9ec7", PNA: "#d64541" };
const GRIS = "#8593a8";

const s = StyleSheet.create({
  page: { paddingHorizontal: 28, paddingVertical: 24, fontSize: 9, fontFamily: "Helvetica", color: "#16233b" },
  membrete: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: AZUL, paddingBottom: 6 },
  membreteTxt: { textAlign: "center", fontSize: 9, fontWeight: 700, color: AZUL, width: "33%" },
  fuente: { marginTop: 4, fontSize: 7, color: GRIS },
  banda: { marginTop: 10, backgroundColor: "#dce7f5", paddingVertical: 8, textAlign: "center" },
  bandaTitulo: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  bandaFechas: { fontSize: 10, fontWeight: 700, color: ROJO, marginTop: 2 },
  panel: { flexDirection: "row", alignItems: "center", marginTop: 14, borderWidth: 1, borderColor: "rgba(14,42,82,.4)", padding: 14, gap: 30 },
  totalBox: { backgroundColor: "#dce7f5", paddingVertical: 10, paddingHorizontal: 26, alignItems: "center" },
  totalLbl: { fontSize: 9, fontWeight: 700, color: AZUL, textTransform: "uppercase" },
  totalNum: { fontSize: 32, fontWeight: 700, marginTop: 2 },
  leyenda: { marginTop: 10, gap: 4 },
  leyendaFila: { flexDirection: "row", alignItems: "center", gap: 6, fontSize: 9, fontWeight: 700 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  h3: { fontSize: 10, fontWeight: 700, marginTop: 16, marginBottom: 4, textTransform: "uppercase" },
  th: { backgroundColor: "#dce7f5", fontWeight: 700, padding: 4, borderWidth: 1, borderColor: "#44536b", fontSize: 8 },
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

function Dona({ cat, total }: { cat: DatosReporte["cat"]; total: number }) {
  const segmentos = (["Militar", "Afiliado", "PNA"] as const).map((k) => ({ k, v: cat[k], color: COL[k] }))
    .filter((x) => x.v > 0);
  let a = 0;
  return (
    <Svg width={150} height={150} viewBox="0 0 200 200">
      {total === 0 ? (
        <Path d="" />
      ) : segmentos.length === 1 ? (
        <Path d={segmentoDona(100, 100, 88, 54, 0, 359.99)} fill={segmentos[0].color} />
      ) : (
        segmentos.map((x) => {
          const barrido = (x.v / total) * 360;
          const d = segmentoDona(100, 100, 88, 54, a, a + barrido);
          a += barrido;
          return <Path key={x.k} d={d} fill={x.color} />;
        })
      )}
    </Svg>
  );
}

export function DocumentoReporte({ d }: { d: DatosReporte }) {
  const fmt = (iso: string) => `${iso.slice(8)}${iso.slice(5, 7).replace(/^0/, "")}`;
  const porTipo = d.tipo === "todos";
  const colsDetalle = 3 + (d.hospitalFiltro === "todos" ? 1 : 0) + (porTipo ? 1 : 0);

  return (
    <Document
      title={`Reporte ${d.tituloTipo} — semana ${d.semana}`}
      author="Sala Situacional DIGESALUD"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.membrete}>
          <Text style={s.membreteTxt}>REPÚBLICA BOLIVARIANA DE VENEZUELA</Text>
          <Text style={s.membreteTxt}>MINISTERIO DEL PODER POPULAR PARA LA DEFENSA</Text>
          <Text style={[s.membreteTxt, { fontSize: 11 }]}>DIGESALUD</Text>
        </View>
        <Text style={s.fuente}>
          FUENTE: SALA SITUACIONAL / DIGESALUD · {d.nombreHospital}
        </Text>

        <View style={s.banda}>
          <Text style={s.bandaTitulo}>Distribución de {d.tituloTipo} en la Red de Salud Militar</Text>
          <Text style={s.bandaFechas}>
            Desde el {fmt(d.semana)} hasta el {fmt(d.semanaHasta)}
          </Text>
        </View>

        <View style={s.panel}>
          <Dona cat={d.cat} total={d.granTotal} />
          <View style={{ flex: 1, alignItems: "center", gap: 12 }}>
            <View style={s.totalBox}>
              <Text style={s.totalLbl}>Total de {d.tituloTipo.toLowerCase()}</Text>
              <Text style={s.totalNum}>{d.granTotal}</Text>
            </View>
            <View style={s.leyenda}>
              {(["Militar", "Afiliado", "PNA"] as const).map((k) => (
                <View key={k} style={s.leyendaFila}>
                  <View style={[s.swatch, { backgroundColor: COL[k] }]} />
                  <Text style={{ width: 54 }}>{k}</Text>
                  <Text>{d.cat[k]}</Text>
                  <Text style={{ color: GRIS }}>
                    ({d.granTotal ? Math.round((d.cat[k] / d.granTotal) * 100) : 0}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Resumen por centro */}
        <Text style={s.h3}>
          {d.hospitalFiltro === "todos" ? "Resumen por centro de salud" : d.nombreHospital}
        </Text>
        <View>
          <View style={{ flexDirection: "row" }}>
            <Text style={[s.th, { width: 24, textAlign: "center" }]}>Nº</Text>
            <Text style={[s.th, { flex: 1 }]}>CENTRO DE SALUD</Text>
            {porTipo ? (
              <>
                <Text style={[s.th, { width: 70, textAlign: "right" }]}>CONSULTAS</Text>
                <Text style={[s.th, { width: 80, textAlign: "right" }]}>INTERVENCIONES</Text>
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
          {d.centros.map((f, i) => (
            <View key={f.id} style={{ flexDirection: "row" }}>
              <Text style={[s.td, { width: 24, textAlign: "center" }]}>{i + 1}</Text>
              <Text style={[s.td, { flex: 1 }]}>{f.nombre}, {f.ubicacion}</Text>
              {porTipo ? (
                <>
                  <Text style={[s.tdR, { width: 70 }]}>{String(f.consultas).padStart(2, "0")}</Text>
                  <Text style={[s.tdR, { width: 80 }]}>{String(f.intervenciones).padStart(2, "0")}</Text>
                  <Text style={[s.tdR, { width: 90 }]}>{String(f.hospitalizaciones).padStart(2, "0")}</Text>
                </>
              ) : (
                <>
                  <Text style={[s.tdR, { width: 60 }]}>{String(f.militar).padStart(2, "0")}</Text>
                  <Text style={[s.tdR, { width: 60 }]}>{String(f.afiliado).padStart(2, "0")}</Text>
                  <Text style={[s.tdR, { width: 50 }]}>{String(f.pna).padStart(2, "0")}</Text>
                </>
              )}
              <Text style={[s.tdR, { width: 55, fontWeight: 700 }]}>
                {String(f.consultas + f.intervenciones + f.hospitalizaciones).padStart(2, "0")}
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
                <Text style={[s.tdR, { width: 80, fontWeight: 700 }]}>
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

        {/* Detalle por especialidad */}
        <Text style={s.h3}>
          Detalle por especialidad{porTipo ? " (todos los servicios)" : ` (${d.tituloTipo.toLowerCase()})`}
        </Text>
        {d.detalle.length === 0 ? (
          <Text style={s.vacio}>Sin detalle cargado para esta selección.</Text>
        ) : (
          <View>
            <View style={{ flexDirection: "row" }}>
              <Text style={[s.th, { width: 24, textAlign: "center" }]}>Nº</Text>
              {d.hospitalFiltro === "todos" && <Text style={[s.th, { flex: 1.2 }]}>CENTRO</Text>}
              <Text style={[s.th, { flex: 1 }]}>ESPECIALIDAD</Text>
              {porTipo && <Text style={[s.th, { width: 75 }]}>SERVICIO</Text>}
              <Text style={[s.th, { width: 55, textAlign: "right" }]}>MILITAR</Text>
              <Text style={[s.th, { width: 55, textAlign: "right" }]}>AFILIADO</Text>
              <Text style={[s.th, { width: 45, textAlign: "right" }]}>PNA</Text>
              <Text style={[s.th, { width: 50, textAlign: "right" }]}>TOTAL</Text>
            </View>
            {d.detalle.map((x, i) => (
              <View key={i} style={{ flexDirection: "row" }}>
                <Text style={[s.td, { width: 24, textAlign: "center" }]}>{i + 1}</Text>
                {d.hospitalFiltro === "todos" && <Text style={[s.td, { flex: 1.2 }]}>{x.hospital}</Text>}
                <Text style={[s.td, { flex: 1 }]}>{x.especialidad}</Text>
                {porTipo && <Text style={[s.td, { width: 75 }]}>{x.tipo}</Text>}
                <Text style={[s.tdR, { width: 55 }]}>{String(x.Militar).padStart(2, "0")}</Text>
                <Text style={[s.tdR, { width: 55 }]}>{String(x.Afiliado).padStart(2, "0")}</Text>
                <Text style={[s.tdR, { width: 45 }]}>{String(x.PNA).padStart(2, "0")}</Text>
                <Text style={[s.tdR, { width: 50, fontWeight: 700 }]}>
                  {String(x.Militar + x.Afiliado + x.PNA).padStart(2, "0")}
                </Text>
              </View>
            ))}
            <View style={[{ flexDirection: "row" }, s.filaTotal]}>
              <Text style={[s.td, { width: 24, textAlign: "center" }]} />
              <Text
                style={[s.td, { flex: 1, fontWeight: 700 }]}
              >
                TOTAL
              </Text>
              {d.hospitalFiltro === "todos" && <Text style={[s.td, { flex: 1.2 }]} />}
              {porTipo && <Text style={[s.td, { width: 75 }]} />}
              <Text style={[s.tdR, { width: 55, fontWeight: 700 }]}>
                {d.detalle.reduce((a, x) => a + x.Militar, 0)}
              </Text>
              <Text style={[s.tdR, { width: 55, fontWeight: 700 }]}>
                {d.detalle.reduce((a, x) => a + x.Afiliado, 0)}
              </Text>
              <Text style={[s.tdR, { width: 45, fontWeight: 700 }]}>
                {d.detalle.reduce((a, x) => a + x.PNA, 0)}
              </Text>
              <Text style={[s.tdR, { width: 50, fontWeight: 700 }]}>
                {d.detalle.reduce((a, x) => a + x.Militar + x.Afiliado + x.PNA, 0)}
              </Text>
            </View>
          </View>
        )}
        <Text
          style={{ position: "absolute", bottom: 16, left: 28, fontSize: 7, color: GRIS }}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages} · Sala Situacional / DIGESALUD`}
        />
      </Page>
    </Document>
  );
}
