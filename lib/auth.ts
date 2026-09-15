import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const CLAVE = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "sala-situacional-digesalud-dev-secret",
);
const COOKIE = "sesion_digesalud";

export type Sesion = {
  userId: number;
  rol: "admin" | "centro";
  hospitalId: number | null;
  nombre: string;
  email: string;
};

export async function crearSesion(s: Sesion) {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(CLAVE);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

export const getSesion = cache(async (): Promise<Sesion | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<Sesion>(token, CLAVE);
    return payload;
  } catch {
    return null;
  }
});

export async function verificarClave(email: string, clave: string): Promise<Sesion | null> {
  const bcrypt = await import("bcryptjs");
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email.toLowerCase().trim()));
  if (!u || !u.activo || !bcrypt.compareSync(clave, u.claveHash)) return null;
  return { userId: u.id, rol: u.rol, hospitalId: u.hospitalId, nombre: u.nombre, email: u.email };
}
