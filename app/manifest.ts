import type { MetadataRoute } from "next"

// Manifest de la PWA de LIPgo. Habilita "Instalar / Añadir a pantalla de
// inicio" en escritorio y movil, usando el logo ya cargado en el proyecto
// (public/lipgo-icon.png, 2161x2161 con transparencia). Next.js lo publica
// en /manifest.webmanifest y agrega el <link rel="manifest"> automaticamente.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Servimos - Gestión de Personal en Misión",
    short_name: "Servimos",
    description: "Plataforma de gestión de personal temporal y en misión",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F7FC",
    theme_color: "#5bc0de",
    icons: [
      { src: "/lipgo-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/lipgo-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
