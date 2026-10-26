import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Google Tag Manager. `beforeInteractive` lo inyecta en el HTML inicial, antes de
// cualquier módulo de Next: es la traducción de "lo más arriba posible en <head>".
const GTM_ID = "GTM-5R74FZ7N";

// Google Analytics 4 vía gtag.js. Convive con GTM porque los dos usan el mismo
// `dataLayer`: gtag empuja sus eventos y el contenedor los ve.
const GA_ID = "G-FRVM5MVVCX";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--fuente-cuerpo",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sala Situacional · Red Sanitaria Militar",
  description: "Reporte semanal de actividades — DIGESALUD",
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${archivo.variable} font-sans min-h-dvh antialiased`}>
        {/* Respaldo sin JS: mismo contenedor, primer hijo del body. */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Script
          id="gtm"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
        {/* GA4 (gtag.js). El loader va en `afterInteractive`: con `beforeInteractive`
            Next esperaría su descarga para hidratar, y eso no. El config sí se encola
            antes porque no necesita a gtag.js — solo empuja a dataLayer, y gtag.js
            procesa la cola cuando llega. */}
        <Script
          id="gtag"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script
          id="gtag-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
