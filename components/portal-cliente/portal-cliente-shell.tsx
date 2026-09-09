"use client"

// Portal cliente — layout fiel al prototipo del paquete: sidebar oscura
// teal fija a la izquierda (marca + navegación agrupada), encabezado con
// cliente/quincena/usuario, contenido a la derecha. Reemplaza el shell de
// barra superior simple que había antes.

import { useEffect, useMemo, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  CalendarClock,
  NotebookPen,
  Fingerprint,
  Users,
  UserPlus,
  Gavel,
  CalendarX,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"

interface NavItem {
  href: string
  label: string
  icon: any
  badge?: number
}

const NAV_OPERACION: NavItem[] = [
  { href: "/portal-cliente/programacion", label: "Programación", icon: CalendarClock },
  { href: "/portal-cliente/novedades", label: "Novedades", icon: NotebookPen },
  { href: "/portal-cliente/asistencia", label: "Control de asistencia", icon: Fingerprint },
]

const NAV_PERSONAL: NavItem[] = [
  { href: "/portal-cliente/personal-activo", label: "Personal activo", icon: Users },
  { href: "/portal-cliente/solicitar-personal", label: "Solicitar personal", icon: UserPlus },
  { href: "/portal-cliente/disciplinarios", label: "Disciplinarios", icon: Gavel },
  { href: "/portal-cliente/ausentismo", label: "Ausentismo", icon: CalendarX },
]

const NAV_ADMIN: NavItem[] = [
  { href: "/portal-cliente/solicitudes-sla", label: "Solicitudes y SLA", icon: ClipboardList },
  { href: "/portal-cliente/seguridad-social", label: "Seguridad social", icon: ShieldCheck },
  { href: "/portal-cliente/cierre-quincenal", label: "Cierre quincenal", icon: CheckCircle2 },
  { href: "/portal-cliente/mi-facturacion", label: "Mi facturación", icon: Receipt },
  { href: "/portal-cliente/prefactura", label: "Prefactura", icon: FileSpreadsheet },
]

const TITULOS: Record<string, string> = {
  "/portal-cliente/inicio": "Panel del día",
  "/portal-cliente/programacion": "Programación del personal",
  "/portal-cliente/novedades": "Novedades",
  "/portal-cliente/asistencia": "Control de asistencia",
  "/portal-cliente/personal-activo": "Personal activo",
  "/portal-cliente/solicitar-personal": "Solicitar personal",
  "/portal-cliente/disciplinarios": "Disciplinarios",
  "/portal-cliente/ausentismo": "Ausentismo",
  "/portal-cliente/solicitudes-sla": "Solicitudes y SLA",
  "/portal-cliente/seguridad-social": "Seguridad social",
  "/portal-cliente/cierre-quincenal": "Cierre quincenal",
  "/portal-cliente/mi-facturacion": "Mi facturación",
  "/portal-cliente/prefactura": "Prefactura",
}

function quincenaLabel(): string {
  const hoy = new Date()
  const primera = hoy.getDate() <= 15
  const desde = primera ? 1 : 16
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const hasta = primera ? 15 : ultimoDia
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  return `${desde} – ${hasta} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`
}

function NavGroup({ titulo, items, pathname }: { titulo?: string; items: NavItem[]; pathname: string | null }) {
  return (
    <div>
      {titulo && <div className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5fa39c]">{titulo}</div>}
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <div className={`pcl-nav-item flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${active ? "active" : ""}`}>
                <item.icon className="h-4 w-4 flex-none" />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: "#fd7e14" }}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function PortalClienteShell({ children }: { children: ReactNode }) {
  const { loading, userId, contexto, logout } = usePortalCliente()
  const router = useRouter()
  const pathname = usePathname()
  const quincena = useMemo(() => quincenaLabel(), [])

  useEffect(() => {
    if (!loading && !userId) {
      router.replace("/portal-cliente/login")
    }
  }, [loading, userId, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0e3b3b" }}>
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    )
  }

  if (!userId) return null

  const titulo = (pathname && TITULOS[pathname]) ?? "Portal cliente"
  const iniciales = (contexto?.nombre ?? "US")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f6f8fb" }}>
      <style>{`
        .pcl-sidebar{ background:linear-gradient(180deg,#0e3b3b,#0a2e2e); }
        .pcl-nav-item{ color:#a8ccc8; }
        .pcl-nav-item:hover{ background:rgba(255,255,255,.06); }
        .pcl-nav-item.active{ background:rgba(33,212,200,.14); color:#21d4c8; box-shadow: inset 2px 0 0 #21d4c8; }
      `}</style>

      <aside className="pcl-sidebar flex w-60 flex-none flex-col text-white">
        <Link href="/portal-cliente/inicio">
          <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-extrabold" style={{ backgroundColor: "#21d4c8", color: "#0b3f4d" }}>
              S
            </span>
            <div>
              <div className="text-[15px] font-extrabold leading-none">Servimos</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#4f9d97]">Portal cliente</div>
            </div>
          </div>
        </Link>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          <NavGroup items={NAV_OPERACION} pathname={pathname} />
          <NavGroup titulo="Mi personal" items={NAV_PERSONAL} pathname={pathname} />
          <NavGroup titulo="Administración" items={NAV_ADMIN} pathname={pathname} />
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <button
            onClick={() => logout().then(() => router.replace("/portal-cliente/login"))}
            className="pcl-nav-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium"
          >
            <LogOut className="h-4 w-4 flex-none" />
            Salir
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-card px-6 py-3" style={{ borderColor: "#e5eaf1" }}>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "#5bc0de" }}>
              Operación
            </div>
            <div className="text-[19px] font-bold text-foreground">{titulo}</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold text-foreground" style={{ borderColor: "#e5eaf1" }}>
              {contexto?.clientes?.nombre ?? "—"}
            </div>
            <div className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12.5px]" style={{ backgroundColor: "#f6f8fb" }}>
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="px-1 text-center">
                <div className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">Quincena</div>
                <div className="font-mono font-semibold text-foreground">{quincena}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold" style={{ backgroundColor: "#12706b", color: "#ffffff" }}>
                {iniciales}
              </span>
              <div className="hidden sm:block">
                <div className="text-[12.5px] font-semibold text-foreground">{contexto?.nombre ?? "Usuario"}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{contexto?.rol?.replace("_", " ") ?? ""}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
