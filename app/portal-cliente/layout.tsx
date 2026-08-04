import type { ReactNode } from "react"
import { PortalClienteProvider } from "@/components/portal-cliente/portal-cliente-provider"
import { Toaster } from "@/components/ui/toaster"

// Layout raíz del Portal de Empresas Cliente de Servimos. Envuelve todas
// las rutas /portal-cliente/* con la sesión real de Supabase Auth (ver
// components/portal-cliente/portal-cliente-provider.tsx).
export default function PortalClienteLayout({ children }: { children: ReactNode }) {
  return (
    <PortalClienteProvider>
      {children}
      <Toaster />
    </PortalClienteProvider>
  )
}
