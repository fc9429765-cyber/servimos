"use client"

// Programación — lado portal-cliente. Reemplaza la versión de Fase 1
// (esquema borrado). Usa los mismos componentes de nivel que el lado
// interno, con las acciones de sesión/RLS de
// lib/portal-cliente-programacion-actions.ts.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { ProgramacionView } from "@/components/servimos/programacion/programacion-view"
import * as actions from "@/lib/portal-cliente-programacion-actions"
import { getParametrosNominaAnio } from "@/lib/servimos/parametros"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import type { ParametrosNomina } from "@/lib/servimos/payroll-engine"

export function ProgramacionCliente() {
  const { userId, contexto } = usePortalCliente()
  const [parametros, setParametros] = useState<ParametrosNomina | null>(null)

  useEffect(() => {
    getParametrosNominaAnio(new Date().getFullYear()).then(setParametros)
  }, [])

  if (!contexto || !parametros) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    )
  }

  return <ProgramacionView clienteId={contexto.cliente_id} actions={actions} parametros={parametros} userId={userId ?? undefined} />
}
