import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DB_URL ?? "file:./data/registros.db",
    authToken: process.env.DB_TOKEN,
  },
} satisfies Config;
