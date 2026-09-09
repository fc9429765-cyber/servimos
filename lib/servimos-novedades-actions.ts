"use server"

// Novedades — lado INTERNO (staff de Servimos, service role, cruza
// clientes). Mismas firmas que lib/portal-cliente-novedades-actions.ts
// para que components/servimos/novedades/novedades-view.tsx funcione igual
// desde ambos lados.

import { getSupabaseAdminServimos } from "@/lib/supabase-admin"

export async function getTiposNovedad() {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase.from("tipos_novedad").select("*").order("codigo")
  if (error) {
    console.error("[servimos] Error fetching tipos_novedad:", error)
    return []
  }
  return data
}

export async function getTrabajadores(clienteId: string) {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase
    .from("trabajadores")
    .select("id, nombre, cedula")
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .order("nombre")
  if (error) {
    console.error("[servimos] Error fetching trabajadores:", error)
    return []
  }
  return data
}

// Lista TODAS las novedades (de cualquier cliente) — el parámetro clienteId
// existe solo por paridad de firma con el lado portal-cliente; aquí no
// filtra (el staff de Servimos ve todo).
export async function getNovedades(_clienteId?: string) {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase
    .from("novedades")
    .select("*, trabajadores(nombre, cedula, cliente_id, clientes(nombre))")
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[servimos] Error fetching novedades:", error)
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
  const supabase = await getSupabaseAdminServimos()
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
    console.error("[servimos] Error creando novedad:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function aprobarNovedad(id: string, aprobadaPor: string) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase
    .from("novedades")
    .update({ estado: "aprobada", aprobada_por: aprobadaPor, aprobada_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("[servimos] Error aprobando novedad:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function rechazarNovedad(id: string, aprobadaPor: string) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase
    .from("novedades")
    .update({ estado: "rechazada", aprobada_por: aprobadaPor, aprobada_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("[servimos] Error rechazando novedad:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}
