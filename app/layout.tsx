import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--fuente-cuerpo",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sala Situacional · Red de Salud Militar",
  description: "Reporte semanal de actividades — DIGESALUD",
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${archivo.variable} font-sans min-h-dvh antialiased`}>{children}</body>
    </html>
  );
}
