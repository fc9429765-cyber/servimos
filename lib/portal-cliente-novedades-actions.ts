"use server"

// Novedades — lado PORTAL-CLIENTE (cliente de sesión, RLS decide qué puede
// ver/escribir). Mismas firmas que lib/servimos-novedades-actions.ts.

import { createServimosServerClient } from "@/lib/supabase-server"

export async function getTiposNovedad() {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase.from("tipos_novedad").select("*").order("codigo")
  if (error) {
    console.error("[portal-cliente] Error fetching tipos_novedad:", error)
    return []
  }
  return data
}

export async function getTrabajadores(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("trabajadores")
    .select("id, nombre, cedula")
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .order("nombre")
  if (error) {
    console.error("[portal-cliente] Error fetching trabajadores:", error)
    return []
  }
  return data
}

// RLS ya limita esto a las novedades de trabajadores del cliente de la
// sesión — el parámetro clienteId existe solo por paridad de firma.
export async function getNovedades(_clienteId?: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("novedades")
    .select("*, trabajadores(nombre, cedula)")
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching novedades:", error)
    return []
  }
  return data
}

export async function crearNovedad(params: {
  trabajadorId: string
  tipo: string
  fechaDesde: string
  fechaHasta: string
  cantidad: number
  observacion?: string
  soportePath?: string
  reportadaPor?: string
}) {
  const supabase = createServimosServerClient()
  const { error } = await supabase.from("novedades").insert({
    trabajador_id: params.trabajadorId,
    tipo: params.tipo,
    fecha_desde: params.fechaDesde,
    fecha_hasta: params.fechaHasta,
    cantidad: params.cantidad,
    observacion: params.observacion,
    soporte_path: params.soportePath,
    reportada_por: params.reportadaPor ?? null,
  })
  if (error) {
    console.error("[portal-cliente] Error creando novedad:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

// Aprobar/rechazar es exclusivo de Servimos — RLS (nov_update) lo bloquea
// desde este lado; se exponen por paridad de firma pero nunca deberían
// llamarse desde el portal-cliente (la UI no muestra esos botones aquí).
export async function aprobarNovedad(_id: string, _aprobadaPor: string) {
  return { success: false, message: "Solo el staff de Servimos puede aprobar novedades" }
}

export async function rechazarNovedad(_id: string, _aprobadaPor: string) {
  return { success: false, message: "Solo el staff de Servimos puede rechazar novedades" }
}
