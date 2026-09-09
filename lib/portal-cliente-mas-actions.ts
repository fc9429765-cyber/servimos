"use server"

// Lecturas adicionales del portal-cliente para las pantallas que ya tienen
// tabla en el esquema (Personal activo, Seguridad social, Solicitudes y
// SLA, Cierre quincenal, Mi facturación, Prefactura) aunque su flujo de
// escritura completo (requisiciones con terna, PILA cargada, etc.) sea de
// una fase futura — ver plan de Fase 2 §"fuera de alcance".

import { createServimosServerClient } from "@/lib/supabase-server"

export async function getTrabajadoresDetalle(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("trabajadores")
    .select("id, cedula, nombre, cargo, salario, eps, afp, activo, created_at")
    .eq("cliente_id", clienteId)
    .order("nombre")
  if (error) {
    console.error("[portal-cliente] Error fetching trabajadores (detalle):", error)
    return []
  }
  return data
}

export async function getPlanillasPila(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("planillas_pila")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("periodo", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching planillas_pila:", error)
    return []
  }
  return data
}

export async function getSolicitudes(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("solicitudes")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("creada_at", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching solicitudes:", error)
    return []
  }
  return data
}

export async function getFirmaQuincena(clienteId: string, periodoIni: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("firmas_quincena")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("periodo_ini", periodoIni)
    .maybeSingle()
  if (error) {
    console.error("[portal-cliente] Error fetching firma_quincena:", error)
    return null
  }
  return data
}

export async function firmarQuincena(params: { clienteId: string; periodoIni: string; periodoFin: string; firmadaPor: string }) {
  const supabase = createServimosServerClient()
  const hash = await sha256(`${params.clienteId}|${params.periodoIni}|${params.periodoFin}|${new Date().toISOString()}`)
  const { error } = await supabase.from("firmas_quincena").insert({
    cliente_id: params.clienteId,
    periodo_ini: params.periodoIni,
    periodo_fin: params.periodoFin,
    firmada_por: params.firmadaPor,
    hash_sha256: hash,
  })
  if (error) {
    console.error("[portal-cliente] Error firmando quincena:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getPrefacturas(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data: liquidaciones } = await supabase.from("liquidaciones").select("id").eq("cliente_id", clienteId)
  const ids = (liquidaciones ?? []).map((l: { id: string }) => l.id)
  if (ids.length === 0) return []
  const { data, error } = await supabase.from("prefacturas").select("*").in("liquidacion_id", ids).order("created_at", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching prefacturas:", error)
    return []
  }
  return data
}

export async function getFacturas(clienteId: string) {
  const prefacturas = await getPrefacturas(clienteId)
  const ids = prefacturas.map((p: any) => p.id)
  if (ids.length === 0) return []
  const supabase = createServimosServerClient()
  const { data, error } = await supabase.from("facturas").select("*").in("prefactura_id", ids).order("emitida_at", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching facturas:", error)
    return []
  }
  return data
}

async function sha256(texto: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(texto)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
