"use client"

// Portal Servimos — app SEPARADA del panel general de LIPGO, para el staff
// interno (analista/jefe_area/admin). Mismo patrón que
// components/portal-cliente/portal-cliente-shell.tsx: su propio layout,
// su propia navegación — pero reusa la sesión de Supabase Auth que ya
// provee <AuthProvider> en app/layout.tsx (el staff interno ya inicia
// sesión en /login; no hace falta un login aparte, el portal se elige por
// el rol/los permisos del usuario autenticado, igual que dice el paquete
// de especificación original).

import { useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Loader2, Home, CalendarClock, NotebookPen, LogOut, ArrowLeftRight, ShieldAlert } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { getUserPermissions } from "@/lib/permissions-actions"

const NAV = [
  { href: "/portal-servimos/inicio", label: "Inicio", icon: Home, grupo: "Operación Servimos" },
  { href: "/portal-servimos/programacion", label: "Programación", icon: CalendarClock, grupo: "Operación Servimos" },
  { href: "/portal-servimos/novedades", label: "Novedades", icon: NotebookPen, grupo: "Operación Servimos" },
  // Nómina y facturación (Bandeja de solicitudes, Vencimientos, Recobro,
  // Asistencia en tablet, Cierre quincenal, Cruce, Prefactura, Facturación,
  // Interfaz Novasoft) — fases futuras, ver plan de Fase 2.
]

export function PortalServimosShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [autorizado, setAutorizado] = useState<boolean | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    getUserPermissions(user.id).then((p) => {
      setAutorizado(!!p && !!(p.servimos_inicio || p.servimos_programacion || p.servimos_novedades))
    })
  }, [user])

  if (loading || (user && autorizado === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0e3b3b" }}>
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    )
  }

  if (user && autorizado === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-white" style={{ backgroundColor: "#0e3b3b" }}>
        <ShieldAlert className="h-8 w-8" style={{ color: "#21d4c8" }} />
        <p className="text-[14px] font-semibold">No tienes acceso al Portal Servimos.</p>
        <Link href="/" className="text-[12.5px] underline" style={{ color: "#21d4c8" }}>
          Volver a LIPGO
        </Link>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f6f8fb" }}>
      <style>{`
        .psv-sidebar{ background:linear-gradient(180deg,#0e3b3b,#0a2e2e); }
        .psv-nav-item{ color:#a8ccc8; }
        .psv-nav-item:hover{ background:rgba(255,255,255,.06); }
        .psv-nav-item.active{ background:rgba(33,212,200,.14); color:#21d4c8; box-shadow: inset 2px 0 0 #21d4c8; }
      `}</style>
      <aside className="psv-sidebar flex w-60 flex-none flex-col text-white">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-extrabold"
            style={{ backgroundColor: "#21d4c8", color: "#0b3f4d" }}
          >
            S
          </span>
          <div>
            <div className="text-[15px] font-extrabold leading-none">Servimos</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#4f9d97]">Portal Servimos</div>
          </div>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          <div>
            <div className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5fa39c]">Operación diaria</div>
            <div className="space-y-0.5">
              {NAV.map((item) => {
                const active = pathname?.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`psv-nav-item flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${active ? "active" : ""}`}>
                      <item.icon className="h-4 w-4 flex-none" />
                      {item.label}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="space-y-1 border-t border-white/10 px-3 py-3">
          <Link href="/">
            <div className="psv-nav-item flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium">
              <ArrowLeftRight className="h-4 w-4 flex-none" />
              Volver a LIPGO
            </div>
          </Link>
          <button
            onClick={() => router.push("/login")}
            className="psv-nav-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium"
          >
            <LogOut className="h-4 w-4 flex-none" />
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
