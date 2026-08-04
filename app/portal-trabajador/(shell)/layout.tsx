import type { ReactNode } from "react"
import { PortalTrabajadorShell } from "@/components/portal-trabajador/portal-trabajador-shell"

export default function PortalTrabajadorShellLayout({ children }: { children: ReactNode }) {
  return <PortalTrabajadorShell>{children}</PortalTrabajadorShell>
}
