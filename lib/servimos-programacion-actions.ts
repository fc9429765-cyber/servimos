"use server"

// Programación — lado INTERNO (staff de Servimos, service role, cruza
// clientes). Mismas firmas de función que lib/portal-cliente-programacion-actions.ts
// para que components/servimos/programacion/* funcione igual desde ambos lados.

import { getSupabaseAdminServimos } from "@/lib/supabase-admin"

export async function getClientes() {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase.from("clientes").select("id, nombre").eq("activo", true).order("nombre")
  if (error) {
    console.error("[servimos] Error fetching clientes:", error)
    return []
  }
  return data
}

export async function getTurnosDefinicion(clienteId: string) {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase
    .from("turnos_definicion")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("codigo")
  if (error) {
    console.error("[servimos] Error fetching turnos_definicion:", error)
    return []
  }
  return data
}

export async function guardarTurnoDefinicion(params: {
  clienteId: string
  codigo: string
  nombre: string
  horaInicio: string
  horaFin: string
  descansoMin: number
  color?: string
}) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase.from("turnos_definicion").upsert(
    {
      cliente_id: params.clienteId,
      codigo: params.codigo,
      nombre: params.nombre,
      hora_inicio: params.horaInicio,
      hora_fin: params.horaFin,
      descanso_min: params.descansoMin,
      color: params.color,
    },
    { onConflict: "cliente_id,codigo" },
  )
  if (error) {
    console.error("[servimos] Error guardando turno_definicion:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getPuestosDemanda(clienteId: string) {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase.from("puestos_demanda").select("*").eq("cliente_id", clienteId).order("puesto")
  if (error) {
    console.error("[servimos] Error fetching puestos_demanda:", error)
    return []
  }
  return data
}

export async function getEquipos(clienteId: string) {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase.from("equipos").select("*").eq("cliente_id", clienteId).order("letra")
  if (error) {
    console.error("[servimos] Error fetching equipos:", error)
    return []
  }
  return data
}

export async function setPatronEquipo(equipoId: string, patron: string) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase.from("equipos").update({ patron }).eq("id", equipoId)
  if (error) {
    console.error("[servimos] Error actualizando patrón de equipo:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getTrabajadores(clienteId: string) {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase
    .from("trabajadores")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .order("nombre")
  if (error) {
    console.error("[servimos] Error fetching trabajadores:", error)
    return []
  }
  return data
}

export async function getProgramacion(clienteId: string, fechaIni: string, fechaFin: string) {
  const supabase = await getSupabaseAdminServimos()
  // programacion no tiene cliente_id directo — se filtra vía trabajadores.
  const { data: trabajadores } = await supabase.from("trabajadores").select("id").eq("cliente_id", clienteId)
  const ids = (trabajadores ?? []).map((t) => t.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from("programacion")
    .select("*")
    .in("trabajador_id", ids)
    .gte("fecha", fechaIni)
    .lte("fecha", fechaFin)
  if (error) {
    console.error("[servimos] Error fetching programacion:", error)
    return []
  }
  return data
}

export async function setProgramacionCelda(params: { trabajadorId: string; fecha: string; turno: string; userId?: string }) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase.from("programacion").upsert(
    {
      trabajador_id: params.trabajadorId,
      fecha: params.fecha,
      turno: params.turno,
      creada_por: params.userId ?? null,
    },
    { onConflict: "trabajador_id,fecha" },
  )
  if (error) {
    console.error("[servimos] Error guardando celda de programación:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

// Agregado global (todos los clientes) para el "Pulso operativo" del
// Inicio general de la app — no confundir con InicioView, que es por
// cliente. Usado por components/daily-summary.tsx.
export async function getPulsoOperativoGlobal() {
  const supabase = await getSupabaseAdminServimos()
  const hoy = new Date().toISOString().slice(0, 10)

  const [novedadesPendientesRes, turnosHoyRes, puestosRes, programacionHoyRes] = await Promise.all([
    supabase.from("novedades").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("programacion").select("id", { count: "exact", head: true }).eq("fecha", hoy),
    supabase.from("puestos_demanda").select("turno, requeridos"),
    supabase.from("programacion").select("turno").eq("fecha", hoy),
  ])

  const requeridoPorTurno: Record<string, number> = {}
  for (const p of puestosRes.data ?? []) requeridoPorTurno[p.turno] = (requeridoPorTurno[p.turno] ?? 0) + p.requeridos
  const totalRequerido = Object.values(requeridoPorTurno).reduce((s, n) => s + n, 0)
  const totalAsignado = (programacionHoyRes.data ?? []).length
  const pctCobertura = totalRequerido > 0 ? Math.round((totalAsignado / totalRequerido) * 100) : null

  return {
    novedadesPendientes: novedadesPendientesRes.count ?? 0,
    turnosProgramadosHoy: turnosHoyRes.count ?? 0,
    pctCobertura,
  }
}

export async function publicarProgramacion(clienteId: string, fechaIni: string, fechaFin: string) {
  const supabase = await getSupabaseAdminServimos()
  const { data: trabajadores } = await supabase.from("trabajadores").select("id").eq("cliente_id", clienteId)
  const ids = (trabajadores ?? []).map((t) => t.id)
  if (ids.length === 0) return { success: false, message: "No hay trabajadores para este cliente" }

  const { error } = await supabase
    .from("programacion")
    .update({ publicada: true })
    .in("trabajador_id", ids)
    .gte("fecha", fechaIni)
    .lte("fecha", fechaFin)
  if (error) {
    console.error("[servimos] Error publicando programación:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}
