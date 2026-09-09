"use client"

// Novedades — lado portal-cliente. Reemplaza la versión de Fase 1 (esquema
// borrado, catálogo fijo de 6 códigos de texto). Usa el catálogo real de
// 15 tipos (servimos.tipos_novedad) vía la vista compartida.

import { NovedadesView } from "@/components/servimos/novedades/novedades-view"
import * as actions from "@/lib/portal-cliente-novedades-actions"
import { usePortalCliente } from "@/components/portal-cliente/portal-cliente-provider"
import { Loader2 } from "lucide-react"

export function NovedadesCliente() {
  const { userId, contexto } = usePortalCliente()

  if (!contexto) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    )
  }

  return <NovedadesView clienteId={contexto.cliente_id} actions={actions} esServimos={false} userId={userId ?? undefined} />
}
