"use client"

import { Fingerprint } from "lucide-react"
import { Proximamente } from "@/components/servimos/ui/proximamente"

export function AsistenciaCliente() {
  return (
    <Proximamente
      icon={Fingerprint}
      titulo="Control de asistencia"
      descripcion="Marcaciones en vivo desde la tablet de portería (servimos.marcaciones ya existe en el esquema). El kiosco y la vista en vivo llegan en una fase siguiente."
    />
  )
}
