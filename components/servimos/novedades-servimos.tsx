"use client"

// Novedades — lado interno (staff de Servimos). Reemplaza la versión de
// Fase 1 (esquema borrado, incapacidades ya no es tabla aparte — vive como
// tipo IEG/IAT dentro de servimos.novedades). Selector de cliente + la
// vista compartida con aprobar/rechazar habilitado.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { NovedadesView } from "@/components/servimos/novedades/novedades-view"
import * as actions from "@/lib/servimos-novedades-actions"
import { getClientes } from "@/lib/servimos-programacion-actions"
import { useAuth } from "@/components/auth-provider"

export function NovedadesServimos() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([])
  const [clienteId, setClienteId] = useState("")

  useEffect(() => {
    getClientes().then((data) => {
      setClientes(data)
      if (data.length > 0) setClienteId(data[0].id)
    })
  }, [])

  if (clientes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-[12.5px] font-semibold text-muted-foreground">Cliente</label>
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-[13px]"
        >
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      {clienteId && <NovedadesView key={clienteId} clienteId={clienteId} actions={actions} esServimos userId={user?.id} />}
    </div>
  )
}
