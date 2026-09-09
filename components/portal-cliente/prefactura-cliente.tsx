"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { getPrefacturas } from "@/lib/portal-cliente-mas-actions"
import { StatusBadge } from "@/components/servimos/ui/status-badge"

const ESTADO_TONO: Record<string, "success" | "warning" | "info" | "neutral"> = {
  borrador: "neutral",
  en_revision: "warning",
  firmada: "info",
  emitida: "success",
}

export function PrefacturaCliente() {
  const { contexto } = usePortalCliente()
  const [prefacturas, setPrefacturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contexto) return
    getPrefacturas(contexto.cliente_id).then((data) => {
      setPrefacturas(data)
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
    <div className="space-y-3">
      {prefacturas.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[13px] font-bold text-foreground">{p.numero}</div>
              <div className="text-[11.5px] text-muted-foreground">AIU: {p.aiu_modo}</div>
            </div>
            <StatusBadge label={p.estado} tono={ESTADO_TONO[p.estado] ?? "neutral"} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[12.5px]">
            <div>
              <div className="text-[10.5px] uppercase text-muted-foreground">AIU</div>
              <div className="font-mono font-semibold text-foreground">
                {Number(p.aiu_valor).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase text-muted-foreground">IVA</div>
              <div className="font-mono font-semibold text-foreground">
                {Number(p.iva).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase text-muted-foreground">Total</div>
              <div className="font-mono font-bold" style={{ color: "#0e3b3b" }}>
                {Number(p.total).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">El IVA grava únicamente el AIU (art. 462-1 E.T.) — el reembolso de nómina no genera IVA.</p>
        </div>
      ))}
      {prefacturas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card py-14 text-center text-[13px] text-muted-foreground">
          Todavía no hay prefacturas generadas para tu empresa en este periodo.
        </div>
      )}
    </div>
  )
}
