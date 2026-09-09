"use client"

import { UserPlus } from "lucide-react"
import { Proximamente } from "@/components/servimos/ui/proximamente"

export function SolicitarPersonalCliente() {
  return (
    <Proximamente
      icon={UserPlus}
      titulo="Solicitar personal"
      descripcion="La requisición con causal legal (art. 77 Ley 50/1990), costo estimado en vivo y seguimiento de terna/exámenes/contratación llega en una fase siguiente. La tabla servimos.solicitudes ya existe para soportarlo."
    />
  )
}
