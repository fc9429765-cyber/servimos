"use client"

import { CalendarX } from "lucide-react"
import { Proximamente } from "@/components/servimos/ui/proximamente"

export function AusentismoCliente() {
  return (
    <Proximamente
      icon={CalendarX}
      titulo="Ausentismo"
      descripcion="Días perdidos por causa y reincidencia por colaborador, calculado a partir de las novedades ya reportadas. Llega en una fase siguiente."
    />
  )
}
