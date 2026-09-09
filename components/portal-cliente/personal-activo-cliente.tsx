"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { getTrabajadoresDetalle } from "@/lib/portal-cliente-mas-actions"
import { StatusBadge } from "@/components/servimos/ui/status-badge"
import { KpiCard } from "@/components/servimos/ui/kpi-card"

export function PersonalActivoCliente() {
  const { contexto } = usePortalCliente()
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contexto) return
    getTrabajadoresDetalle(contexto.cliente_id).then((data) => {
      setTrabajadores(data)
      setLoading(false)
    })
  }, [contexto?.cliente_id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    )
  }

  const activos = trabajadores.filter((t) => t.activo)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Personal activo" value={activos.length} color="#5bc0de" />
        <KpiCard label="Total histórico" value={trabajadores.length} color="#12706b" />
        <KpiCard label="Inactivos" value={trabajadores.length - activos.length} color="#6c757d" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Cédula</th>
              <th className="px-3 py-2">Cargo</th>
              <th className="px-3 py-2">EPS / AFP</th>
              <th className="px-3 py-2 text-right">Salario</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((t) => (
              <tr key={t.id} className="border-t border-border text-[12.5px]">
                <td className="px-3 py-2 font-medium text-foreground">{t.nombre}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{t.cedula}</td>
                <td className="px-3 py-2 text-muted-foreground">{t.cargo}</td>
                <td className="px-3 py-2 text-muted-foreground">{t.eps ?? "—"} · {t.afp ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {Number(t.salario).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge label={t.activo ? "Activo" : "Inactivo"} tono={t.activo ? "success" : "neutral"} />
                </td>
              </tr>
            ))}
            {trabajadores.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Todavía no hay personal en misión asignado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
