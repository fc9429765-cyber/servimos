import type { ReactNode } from "react"
import { PortalTrabajadorProvider } from "@/components/portal-trabajador/portal-trabajador-provider"
import { Toaster } from "@/components/ui/toaster"

export default function PortalTrabajadorLayout({ children }: { children: ReactNode }) {
  return (
    <PortalTrabajadorProvider>
      {children}
      <Toaster />
    </PortalTrabajadorProvider>
  )
}
