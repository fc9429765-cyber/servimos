"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { getPlanillasPila } from "@/lib/portal-cliente-mas-actions"
import { StatusBadge } from "@/components/servimos/ui/status-badge"
import { SpotlightCard } from "@/components/servimos/ui/spotlight-card"

export function SeguridadSocialCliente() {
  const { contexto } = usePortalCliente()
  const [planillas, setPlanillas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contexto) return
    getPlanillasPila(contexto.cliente_id).then((data) => {
      setPlanillas(data)
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

  return (
    <div className="space-y-4">
      <SpotlightCard>
        <div className="text-[13px] font-bold">Responsabilidad solidaria (art. 34 CST)</div>
        <p className="mt-1 max-w-2xl text-[12.5px] text-[#cfe9e6]">
          Como empresa usuaria, respondes solidariamente por los aportes a seguridad social del personal en misión —
          por eso Servimos comparte aquí las planillas PILA de cada periodo.
        </p>
      </SpotlightCard>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Periodo</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Operador</th>
              <th className="px-3 py-2 text-right">Cotizantes</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {planillas.map((p) => (
              <tr key={p.id} className="border-t border-border text-[12.5px]">
                <td className="px-3 py-2 font-mono text-foreground">{p.periodo}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.tipo}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.operador ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{p.cotizantes}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {Number(p.valor).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge label={p.estado} tono={p.estado === "pagada" ? "success" : "warning"} />
                </td>
              </tr>
            ))}
            {planillas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Todavía no hay planillas PILA registradas para tu empresa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
