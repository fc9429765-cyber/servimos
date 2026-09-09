"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { getFacturas } from "@/lib/portal-cliente-mas-actions"
import { StatusBadge } from "@/components/servimos/ui/status-badge"
import { KpiCard } from "@/components/servimos/ui/kpi-card"

export function MiFacturacionCliente() {
  const { contexto } = usePortalCliente()
  const [facturas, setFacturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contexto) return
    getFacturas(contexto.cliente_id).then((data) => {
      setFacturas(data)
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

  const total = facturas.reduce((s, f) => s + Number(f.valor || 0), 0)
  const pagadas = facturas.filter((f) => f.estado === "pagada")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Facturas emitidas" value={facturas.length} color="#5bc0de" />
        <KpiCard label="Pagadas" value={pagadas.length} color="#12706b" />
        <KpiCard
          label="Total facturado"
          value={total.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
          color="#0e3b3b"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Número</th>
              <th className="px-3 py-2">Emitida</th>
              <th className="px-3 py-2">Vence</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id} className="border-t border-border text-[12.5px]">
                <td className="px-3 py-2 font-mono text-foreground">{f.numero}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{f.emitida_at?.slice(0, 10) ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{f.vence_at ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {Number(f.valor).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge label={f.estado} tono={f.estado === "pagada" ? "success" : "info"} />
                </td>
              </tr>
            ))}
            {facturas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Todavía no hay facturas emitidas para tu empresa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
