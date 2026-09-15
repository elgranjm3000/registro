import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";

export default async function Inicio() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  redirect(sesion.rol === "admin" ? "/panel" : "/reportar");
}
