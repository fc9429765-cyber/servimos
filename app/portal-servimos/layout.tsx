import type { ReactNode } from "react"
import { PortalServimosShell } from "@/components/portal-servimos/portal-servimos-shell"

export default function PortalServimosLayout({ children }: { children: ReactNode }) {
  return <PortalServimosShell>{children}</PortalServimosShell>
}
