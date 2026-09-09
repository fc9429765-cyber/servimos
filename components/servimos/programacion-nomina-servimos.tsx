"use client"

// Programación — lado interno (staff de Servimos). Reemplaza a
// components/servimos/programacion-turnos-servimos.tsx (Fase 1, esquema
// borrado). Selector de cliente + los 3 niveles compartidos.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { ProgramacionView } from "@/components/servimos/programacion/programacion-view"
import { getClientes } from "@/lib/servimos-programacion-actions"
import * as actions from "@/lib/servimos-programacion-actions"
import { getParametrosNominaAnio } from "@/lib/servimos/parametros"
import type { ParametrosNomina } from "@/lib/servimos/payroll-engine"

export function ProgramacionNominaServimos() {
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([])
  const [clienteId, setClienteId] = useState<string>("")
  const [parametros, setParametros] = useState<ParametrosNomina | null>(null)

  useEffect(() => {
    getClientes().then((data) => {
      setClientes(data)
      if (data.length > 0) setClienteId(data[0].id)
    })
    getParametrosNominaAnio(new Date().getFullYear()).then(setParametros)
  }, [])

  if (!parametros || clientes.length === 0) {
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
      {clienteId && <ProgramacionView key={clienteId} clienteId={clienteId} actions={actions} parametros={parametros} />}
    </div>
  )
}
