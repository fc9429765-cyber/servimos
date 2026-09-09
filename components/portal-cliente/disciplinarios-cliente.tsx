"use client"

import { Gavel } from "lucide-react"
import { Proximamente } from "@/components/servimos/ui/proximamente"

export function DisciplinariosCliente() {
  return (
    <Proximamente
      icon={Gavel}
      titulo="Disciplinarios"
      descripcion="Tú solicitas la medida disciplinaria, Servimos instruye y decide (debido proceso, art. 115 CST). Este flujo llega en una fase siguiente — la tabla servimos.disciplinarios ya existe para soportarlo."
    />
  )
}
