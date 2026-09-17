import React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import type { DatosReporte } from "./reporte-datos";

const AZUL = "#0e2a52";
const ROJO = "#c0392b";
const COL = { Militar: "#4caf6d", Afiliado: "#2f9ec7", PNA: "#d64541" };
const GRIS = "#8593a8";

// Escudo institucional simplificado (estrella dentro de escudo con laureles).
// Sustituible por el logo oficial cuando se disponga del archivo.
function Estrella({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return <Path d={`M ${pts.join(" L ")} Z`} fill={fill} />;
}

function Escudo({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={{ marginRight: 6 }}>
      <Path
        d="M 20 2 C 27 6, 33 7, 37 7 C 37 20, 34 31, 20 38 C 6 31, 3 20, 3 7 C 7 7, 13 6, 20 2 Z"
        fill="#0e2a52"
        stroke="#b8912f"
        strokeWidth={1.4}
      />
      <Estrella cx={20} cy={17} r={7.5} fill="#f5c542" />
      <Path d="M 10 27 Q 20 32 30 27" fill="none" stroke="#b8912f" strokeWidth={1.2} />
    </Svg>
  );
}

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
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  return (
    <Svg width={170} height={170} viewBox="0 0 200 200">
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "33%" }}>
            <Escudo x={0} y={0} size={26} />
            <Text style={[s.membreteTxt, { textAlign: "left" }]}>REPÚBLICA BOLIVARIANA{"\n"}DE VENEZUELA</Text>
          </View>
          <Text style={s.membreteTxt}>MINISTERIO DEL PODER POPULAR{"\n"}PARA LA DEFENSA</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "33%" }}>
            <Escudo x={0} y={0} size={26} />
            <Text style={[s.membreteTxt, { fontSize: 12, textAlign: "left" }]}>DIGESALUD</Text>
          </View>
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
          fixed
          style={{ position: "absolute", bottom: 14, left: 28, right: 28, fontSize: 7, color: GRIS, textAlign: "center" }}
          render={({ pageNumber, totalPages }) =>
            `Sala Situacional / DIGESALUD · Semana ${d.semana.split("-").reverse().join("")} · Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
