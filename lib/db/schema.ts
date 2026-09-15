import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const hospitales = sqliteTable("hospitales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["hospital", "ambulatorio", "otro"] }).notNull().default("hospital"),
  ubicacion: text("ubicacion").notNull().default(""),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  creadoEn: text("creado_en").notNull().$defaultFn(() => new Date().toISOString()),
});

export const usuarios = sqliteTable(
  "usuarios",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    claveHash: text("clave_hash").notNull(),
    nombre: text("nombre").notNull(),
    rol: text("rol", { enum: ["admin", "centro"] }).notNull(),
    hospitalId: integer("hospital_id").references(() => hospitales.id),
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [uniqueIndex("usuarios_email_idx").on(t.email)],
);

export const reportes = sqliteTable(
  "reportes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hospitalId: integer("hospital_id")
      .notNull()
      .references(() => hospitales.id),
    semanaDesde: text("semana_desde").notNull(), // YYYY-MM-DD (lunes)
    semanaHasta: text("semana_hasta").notNull(), // YYYY-MM-DD (viernes)
    estado: text("estado", { enum: ["pendiente", "verificado", "rechazado"] })
      .notNull()
      .default("pendiente"),

    // Consultas
    consultasMilitar: integer("consultas_militar").notNull().default(0),
    consultasAfiliado: integer("consultas_afiliado").notNull().default(0),
    consultasPna: integer("consultas_pna").notNull().default(0),
    // Intervenciones
    intervencionesMilitar: integer("intervenciones_militar").notNull().default(0),
    intervencionesAfiliado: integer("intervenciones_afiliado").notNull().default(0),
    intervencionesPna: integer("intervenciones_pna").notNull().default(0),
    // Hospitalizaciones
    hospitalizacionesMilitar: integer("hospitalizaciones_militar").notNull().default(0),
    hospitalizacionesAfiliado: integer("hospitalizaciones_afiliado").notNull().default(0),
    hospitalizacionesPna: integer("hospitalizaciones_pna").notNull().default(0),

    observacionCentro: text("observacion_centro").notNull().default(""),
    observacionAdmin: text("observacion_admin").notNull().default(""),
    verificadoEn: text("verificado_en"),
    creadoEn: text("creado_en").notNull().$defaultFn(() => new Date().toISOString()),
    actualizadoEn: text("actualizado_en").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex("reportes_hospital_semana_idx").on(t.hospitalId, t.semanaDesde)],
);

export const especialidades = sqliteTable("especialidades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  orden: integer("orden").notNull().default(100),
});

// Cantidades de consultas por especialidad y categoría, por centro y semana.
// Sin datos de pacientes: solo cifras.
export const consultas = sqliteTable(
  "consultas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hospitalId: integer("hospital_id")
      .notNull()
      .references(() => hospitales.id),
    especialidadId: integer("especialidad_id")
      .notNull()
      .references(() => especialidades.id),
    semanaDesde: text("semana_desde").notNull(), // YYYY-MM-DD (lunes)
    militar: integer("militar").notNull().default(0),
    afiliado: integer("afiliado").notNull().default(0),
    pna: integer("pna").notNull().default(0),
    actualizadoEn: text("actualizado_en").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex("consultas_hospital_esp_semana_idx").on(
      t.hospitalId, t.especialidadId, t.semanaDesde,
    ),
  ],
);

export type Especialidad = typeof especialidades.$inferSelect;
export type Consulta = typeof consultas.$inferSelect;
export const pacientes = sqliteTable("pacientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hospitalId: integer("hospital_id")
    .notNull()
    .references(() => hospitales.id),
  nombre: text("nombre").notNull(),
  cedula: text("cedula").notNull().default(""),
  edad: integer("edad"),
  sexo: text("sexo", { enum: ["M", "F"] }).notNull().default("M"),
  categoria: text("categoria", { enum: ["militar", "afiliado", "pna"] }).notNull(),
  actividad: text("actividad", { enum: ["consultas", "intervenciones", "hospitalizaciones"] }).notNull(),
  fecha: text("fecha").notNull(), // YYYY-MM-DD (día de la atención)
  creadoEn: text("creado_en").notNull().$defaultFn(() => new Date().toISOString()),
});

export const bitacora = sqliteTable("bitacora", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  rol: text("rol").notNull().default(""),
  hospitalId: integer("hospital_id"),
  accion: text("accion", { enum: ["login_exitoso", "login_fallido", "salir"] }).notNull(),
  ip: text("ip").notNull().default(""),
  navegador: text("navegador").notNull().default(""),
  fecha: text("fecha").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Bitacora = typeof bitacora.$inferSelect;
export type Paciente = typeof pacientes.$inferSelect;
export type Hospital = typeof hospitales.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type Reporte = typeof reportes.$inferSelect;

export const METRICAS = ["consultas", "intervenciones", "hospitalizaciones"] as const;
export const CATEGORIAS = ["Militar", "Afiliado", "Pna"] as const;
