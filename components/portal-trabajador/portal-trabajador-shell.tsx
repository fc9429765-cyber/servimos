"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, User } from "lucide-react"
import { usePortalTrabajador } from "@/components/portal-trabajador/portal-trabajador-provider"

export function PortalTrabajadorShell({ children }: { children: ReactNode }) {
  const { trabajador, isHydrated, logout } = usePortalTrabajador()
  const router = useRouter()

  useEffect(() => {
    if (isHydrated && !trabajador) {
      router.replace("/portal-trabajador/login")
    }
  }, [isHydrated, trabajador, router])

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!trabajador) return null

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <User className="h-5 w-5" />
            {trabajador.nombre}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout()
              router.replace("/portal-trabajador/login")
            }}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Salir
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4">{children}</main>
    </div>
  )
}
