import type { ReactNode } from "react"
import { PortalClienteShell } from "@/components/portal-cliente/portal-cliente-shell"

// La página /portal-cliente/login queda fuera de este route group y por
// lo tanto no recibe el shell autenticado (mismo patrón que app/portal/).
export default function PortalClienteShellLayout({ children }: { children: ReactNode }) {
  return <PortalClienteShell>{children}</PortalClienteShell>
}
