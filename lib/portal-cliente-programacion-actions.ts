"use server"

// Programación — lado PORTAL-CLIENTE (cliente de sesión, RLS de
// scripts/servimos/04_nomina_rls.sql decide qué puede ver/escribir). Mismas
// firmas de función que lib/servimos-programacion-actions.ts para que
// components/servimos/programacion/* funcione igual desde ambos lados —
// el parámetro `clienteId` aquí solo viaja para mantener la firma idéntica,
// la RLS es la que de verdad limita el alcance al cliente de la sesión.

import { createServimosServerClient } from "@/lib/supabase-server"

export async function getTurnosDefinicion(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("turnos_definicion")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("codigo")
  if (error) {
    console.error("[portal-cliente] Error fetching turnos_definicion:", error)
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
  const supabase = createServimosServerClient()
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
    console.error("[portal-cliente] Error guardando turno_definicion:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getPuestosDemanda(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase.from("puestos_demanda").select("*").eq("cliente_id", clienteId).order("puesto")
  if (error) {
    console.error("[portal-cliente] Error fetching puestos_demanda:", error)
    return []
  }
  return data
}

export async function getEquipos(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase.from("equipos").select("*").eq("cliente_id", clienteId).order("letra")
  if (error) {
    console.error("[portal-cliente] Error fetching equipos:", error)
    return []
  }
  return data
}

export async function setPatronEquipo(equipoId: string, patron: string) {
  const supabase = createServimosServerClient()
  const { error } = await supabase.from("equipos").update({ patron }).eq("id", equipoId)
  if (error) {
    console.error("[portal-cliente] Error actualizando patrón de equipo:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getTrabajadores(clienteId: string) {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("trabajadores")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .order("nombre")
  if (error) {
    console.error("[portal-cliente] Error fetching trabajadores:", error)
    return []
  }
  return data
}

export async function getProgramacion(clienteId: string, fechaIni: string, fechaFin: string) {
  const supabase = createServimosServerClient()
  const { data: trabajadores } = await supabase.from("trabajadores").select("id").eq("cliente_id", clienteId)
  const ids = (trabajadores ?? []).map((t: { id: string }) => t.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from("programacion")
    .select("*")
    .in("trabajador_id", ids)
    .gte("fecha", fechaIni)
    .lte("fecha", fechaFin)
  if (error) {
    console.error("[portal-cliente] Error fetching programacion:", error)
    return []
  }
  return data
}

export async function setProgramacionCelda(params: { trabajadorId: string; fecha: string; turno: string; userId?: string }) {
  const supabase = createServimosServerClient()
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
    // La RLS bloquea la escritura si la quincena ya está firmada — el
    // mensaje de Postgres llega tal cual para que la UI lo muestre.
    console.error("[portal-cliente] Error guardando celda de programación:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getAprobacionesDiaCount(clienteId: string, fechaIni: string, fechaFin: string) {
  const supabase = createServimosServerClient()
  const { count, error } = await supabase
    .from("aprobaciones_dia")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .gte("fecha", fechaIni)
    .lte("fecha", fechaFin)
  if (error) {
    console.error("[portal-cliente] Error fetching aprobaciones_dia:", error)
    return 0
  }
  return count ?? 0
}

export async function publicarProgramacion(clienteId: string, fechaIni: string, fechaFin: string) {
  const supabase = createServimosServerClient()
  const { data: trabajadores } = await supabase.from("trabajadores").select("id").eq("cliente_id", clienteId)
  const ids = (trabajadores ?? []).map((t: { id: string }) => t.id)
  if (ids.length === 0) return { success: false, message: "No hay trabajadores para este cliente" }

  const { error } = await supabase
    .from("programacion")
    .update({ publicada: true })
    .in("trabajador_id", ids)
    .gte("fecha", fechaIni)
    .lte("fecha", fechaFin)
  if (error) {
    console.error("[portal-cliente] Error publicando programación:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}
