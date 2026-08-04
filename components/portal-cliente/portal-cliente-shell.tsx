"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Send, CalendarClock, Clock, NotebookPen, LogOut, Building2 } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"

const NAV = [
  { href: "/portal-cliente/solicitudes", label: "Solicitudes", icon: Send },
  { href: "/portal-cliente/programacion", label: "Programación", icon: CalendarClock },
  { href: "/portal-cliente/horas-extra", label: "Horas Extra", icon: Clock },
  { href: "/portal-cliente/novedades", label: "Novedades", icon: NotebookPen },
]

export function PortalClienteShell({ children }: { children: ReactNode }) {
  const { loading, userId, contexto, logout } = usePortalCliente()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !userId) {
      router.replace("/portal-cliente/login")
    }
  }, [loading, userId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!userId) return null

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="h-5 w-5" />
            {contexto?.empresas_cliente?.nombre ?? "Portal Servimos"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout().then(() => router.replace("/portal-cliente/login"))
            }}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Salir
          </Button>
        </div>
        <nav className="max-w-5xl mx-auto flex gap-1 px-4 pb-2 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={active ? "default" : "ghost"} size="sm" className="whitespace-nowrap">
                  <item.icon className="h-4 w-4 mr-1" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-4">{children}</main>
    </div>
  )
}
