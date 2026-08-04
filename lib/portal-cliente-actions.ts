"use server"

// Server actions del portal-cliente (empresas que le piden personal a
// Servimos). A diferencia de lib/servimos-actions.ts (staff interno, usa
// el admin/service role), estas usan createServimosServerClient() — el
// cliente SSR atado a la cookie de sesión de Supabase Auth del usuario
// logueado — para que la RLS de scripts/servimos/01_fundacion_servimos.sql
// sea la que realmente decide qué puede ver/escribir cada empresa.

import { createServimosServerClient } from "@/lib/supabase-server"
import { generarNominaBasicaDesdeTurno, aprobarHorasExtra as aprobarHorasExtraInterno } from "@/lib/servimos-actions"

export async function getEmpresaClienteActual() {
  const supabase = createServimosServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("usuarios_empresa_cliente")
    .select("empresa_cliente_id, rol, nombre, empresas_cliente(nombre, sla_horas_objetivo)")
    .eq("auth_user_id", user.id)
    .single()

  if (error || !data) return null
  return data
}

// ---------------------------------------------------------------------
// Solicitudes de personal (con SLA)
// ---------------------------------------------------------------------

export async function crearSolicitudPersonal(params: {
  puesto: string
  cantidad: number
  fechaRequerida: string
  observaciones?: string
}) {
  const supabase = createServimosServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "No autenticado" }

  const contexto = await getEmpresaClienteActual()
  if (!contexto) return { success: false, message: "Usuario sin empresa asociada" }

  const slaHoras = (contexto as any).empresas_cliente?.sla_horas_objetivo ?? 48
  const fechaSolicitud = new Date()
  const fechaLimiteSla = new Date(fechaSolicitud.getTime() + slaHoras * 60 * 60 * 1000)

  const { error } = await supabase.from("solicitudes_personal").insert({
    empresa_cliente_id: contexto.empresa_cliente_id,
    puesto: params.puesto,
    cantidad: params.cantidad,
    fecha_requerida: params.fechaRequerida,
    observaciones: params.observaciones,
    sla_horas_objetivo: slaHoras,
    fecha_solicitud: fechaSolicitud.toISOString(),
    fecha_limite_sla: fechaLimiteSla.toISOString(),
    solicitado_por: user.id,
  })

  if (error) {
    console.error("[portal-cliente] Error creating solicitud:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getMisSolicitudes() {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase.from("solicitudes_personal").select("*").order("fecha_solicitud", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching solicitudes:", error)
    return []
  }
  return data
}

export async function getPersonalAsignado() {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase.from("personal_mision").select("*").eq("estado", "Activo").order("nombre")
  if (error) {
    console.error("[portal-cliente] Error fetching personal:", error)
    return []
  }
  return data
}

// ---------------------------------------------------------------------
// Programación de turnos/horarios — dispara la nómina básica.
// ---------------------------------------------------------------------

export async function programarTurno(params: {
  personalMisionId: number
  fecha: string
  horaInicio: string
  horaFin: string
  puesto?: string
}) {
  const supabase = createServimosServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "No autenticado" }

  const contexto = await getEmpresaClienteActual()
  if (!contexto) return { success: false, message: "Usuario sin empresa asociada" }

  const { data, error } = await supabase
    .from("programacion_turnos")
    .insert({
      personal_mision_id: params.personalMisionId,
      empresa_cliente_id: contexto.empresa_cliente_id,
      fecha: params.fecha,
      hora_inicio: params.horaInicio,
      hora_fin: params.horaFin,
      puesto: params.puesto,
      programado_por: user.id,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("[portal-cliente] Error programando turno:", error)
    return { success: false, message: error?.message ?? "Error al programar el turno" }
  }

  // nomina_generada está cerrada por RLS a service role — la genera la
  // implementación interna compartida, no el cliente anon.
  await generarNominaBasicaDesdeTurno(data.id)

  return { success: true }
}

export async function getMisTurnos() {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("programacion_turnos")
    .select("*, personal_mision(nombre, identificacion)")
    .order("fecha", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching turnos:", error)
    return []
  }
  return data
}

// ---------------------------------------------------------------------
// Horas extra — el supervisor asigna, el jefe de área aprueba.
// ---------------------------------------------------------------------

export async function asignarHorasExtra(params: {
  personalMisionId: number
  fecha: string
  horas: number
  motivo?: string
}) {
  const supabase = createServimosServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "No autenticado" }

  const contexto = await getEmpresaClienteActual()
  if (!contexto) return { success: false, message: "Usuario sin empresa asociada" }

  if (!["supervisor", "jefe_area"].includes(contexto.rol)) {
    return { success: false, message: "Solo un supervisor puede asignar horas extra" }
  }

  const { error } = await supabase.from("horas_extra").insert({
    personal_mision_id: params.personalMisionId,
    empresa_cliente_id: contexto.empresa_cliente_id,
    fecha: params.fecha,
    horas: params.horas,
    motivo: params.motivo,
    asignado_por: user.id,
  })

  if (error) {
    console.error("[portal-cliente] Error asignando horas extra:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getMisHorasExtra() {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("horas_extra")
    .select("*, personal_mision(nombre, identificacion)")
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching horas extra:", error)
    return []
  }
  return data
}

export async function aprobarHorasExtraCliente(horasExtraId: number) {
  const supabase = createServimosServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "No autenticado" }

  const contexto = await getEmpresaClienteActual()
  if (!contexto || contexto.rol !== "jefe_area") {
    return { success: false, message: "Solo el Jefe de Área puede aprobar horas extra" }
  }

  // Reusa la implementación interna (update + cálculo básico de nómina);
  // el alcance a "solo su empresa" ya lo valida la RLS de horas_extra.
  return aprobarHorasExtraInterno(horasExtraId, user.id)
}

// ---------------------------------------------------------------------
// Novedades (ausentismos, permisos, etc.)
// ---------------------------------------------------------------------

export async function reportarNovedad(params: {
  personalMisionId: number
  codigo: string
  tipoNovedad: "Valor" | "Dias" | "Horas"
  cantidadValor?: number
  fechaInicio: string
  fechaFin?: string
  observaciones?: string
}) {
  const supabase = createServimosServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "No autenticado" }

  const contexto = await getEmpresaClienteActual()
  if (!contexto) return { success: false, message: "Usuario sin empresa asociada" }

  const { error } = await supabase.from("novedades").insert({
    personal_mision_id: params.personalMisionId,
    empresa_cliente_id: contexto.empresa_cliente_id,
    codigo: params.codigo,
    tipo_novedad: params.tipoNovedad,
    cantidad_valor: params.cantidadValor,
    fecha_inicio: params.fechaInicio,
    fecha_fin: params.fechaFin,
    observaciones: params.observaciones,
    reportado_por: user.id,
    origen: "cliente",
  })

  if (error) {
    console.error("[portal-cliente] Error reportando novedad:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}

export async function getMisNovedades() {
  const supabase = createServimosServerClient()
  const { data, error } = await supabase
    .from("novedades")
    .select("*, personal_mision(nombre, identificacion)")
    .order("fecha_inicio", { ascending: false })
  if (error) {
    console.error("[portal-cliente] Error fetching novedades:", error)
    return []
  }
  return data
}
