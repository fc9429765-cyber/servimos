"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { getSolicitudes } from "@/lib/portal-cliente-mas-actions"
import { StatusBadge } from "@/components/servimos/ui/status-badge"
import { KpiCard } from "@/components/servimos/ui/kpi-card"

export function SolicitudesSlaCliente() {
  const { contexto } = usePortalCliente()
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contexto) return
    getSolicitudes(contexto.cliente_id).then((data) => {
      setSolicitudes(data)
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

  const abiertas = solicitudes.filter((s) => s.estado === "abierta")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Solicitudes abiertas" value={abiertas.length} color="#5bc0de" />
        <KpiCard label="Total del periodo" value={solicitudes.length} color="#12706b" />
        <KpiCard label="SLA promedio" value="—" hint="Se calcula cuando haya solicitudes cerradas" color="#6c757d" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Área</th>
              <th className="px-3 py-2">SLA</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} className="border-t border-border text-[12.5px]">
                <td className="px-3 py-2 font-mono text-foreground">{s.codigo}</td>
                <td className="px-3 py-2 text-foreground">{s.titulo}</td>
                <td className="px-3 py-2 text-muted-foreground capitalize">{s.tipo}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.area ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{s.sla_horas}h</td>
                <td className="px-3 py-2">
                  <StatusBadge label={s.estado} tono={s.estado === "abierta" ? "warning" : "success"} />
                </td>
              </tr>
            ))}
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No tienes solicitudes registradas. El formulario para crear nuevas llega en una fase siguiente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
