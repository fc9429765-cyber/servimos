"use client"

// Inicio — lado interno. Reemplaza a "Cuadro de Control Servimos" en el
// mismo lugar del menú (ver lib/dashboard-data.ts).

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { InicioView } from "@/components/servimos/inicio/inicio-view"
import { getClientes } from "@/lib/servimos-programacion-actions"
import * as programacionActions from "@/lib/servimos-programacion-actions"
import * as novedadesActions from "@/lib/servimos-novedades-actions"

export function InicioServimos() {
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

  const clienteNombre = clientes.find((c) => c.id === clienteId)?.nombre

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
      {clienteId && (
        <InicioView
          key={clienteId}
          clienteId={clienteId}
          clienteNombre={clienteNombre}
          programacionActions={programacionActions}
          novedadesActions={novedadesActions}
        />
      )}
    </div>
  )
}
