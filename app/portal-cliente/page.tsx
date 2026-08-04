import { redirect } from "next/navigation"

// Entrada sin sección explícita: manda a Solicitudes (el shell redirige
// a /portal-cliente/login si no hay sesión).
export default function PortalClienteIndexPage() {
  redirect("/portal-cliente/solicitudes")
}
