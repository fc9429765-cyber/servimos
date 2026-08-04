"use server"

// Server actions internas de Servimos (staff, no el cliente externo).
// Usan getSupabaseAdminServimos() (service role, bypassa RLS) igual que
// el resto de LIPgo — mismo patrón que lib/programacion-turnos-actions.ts
// y lib/solicitud-turnos-actions.ts, pero apuntado al esquema `servimos`.

import { getSupabaseAdminServimos } from "@/lib/supabase-admin"

// ---------------------------------------------------------------------
// Solicitudes de personal (aprobar/rechazar/asignar)
// ---------------------------------------------------------------------

export async function getSolicitudesPersonal(estado?: string) {
  const supabase = await getSupabaseAdminServimos()
  let query = supabase
    .from("solicitudes_personal")
    .select("*, empresas_cliente(nombre)")
    .order("fecha_solicitud", { ascending: false })
  if (estado) query = query.eq("estado", estado)

  const { data, error } = await query
  if (error) {
    console.error("[servimos] Error fetching solicitudes:", error)
    return []
  }
  return data
}

export async function getPersonalMisionActivo(empresaClienteId?: number) {
  const supabase = await getSupabaseAdminServimos()
  let query = supabase.from("personal_mision").select("*").eq("estado", "Activo").order("nombre")
  if (empresaClienteId) query = query.eq("empresa_cliente_id", empresaClienteId)

  const { data, error } = await query
  if (error) {
    console.error("[servimos] Error fetching personal activo:", error)
    return []
  }
  return data
}

export async function aprobarYAsignarSolicitud(solicitudId: number, personalMisionIds: number[], aprobadoPor: string) {
  const supabase = await getSupabaseAdminServimos()

  const { data: solicitud, error: solicitudError } = await supabase
    .from("solicitudes_personal")
    .select("fecha_limite_sla")
    .eq("id", solicitudId)
    .single()

  if (solicitudError || !solicitud) {
    return { success: false, message: "Solicitud no encontrada" }
  }

  const fechaEntrega = new Date()
  const cumplioSla = solicitud.fecha_limite_sla ? fechaEntrega <= new Date(solicitud.fecha_limite_sla) : null

  const asignaciones = personalMisionIds.map((personalMisionId) => ({
    solicitud_id: solicitudId,
    personal_mision_id: personalMisionId,
  }))

  const { error: asignacionError } = await supabase.from("solicitud_personal_asignacion").insert(asignaciones)
  if (asignacionError) {
    console.error("[servimos] Error creating asignaciones:", asignacionError)
    return { success: false, message: asignacionError.message }
  }

  const { error: updateError } = await supabase
    .from("solicitudes_personal")
    .update({
      estado: "entregada",
      fecha_entrega: fechaEntrega.toISOString(),
      cumplio_sla: cumplioSla,
      aprobado_por: aprobadoPor,
    })
    .eq("id", solicitudId)

  if (updateError) {
    console.error("[servimos] Error updating solicitud:", updateError)
    return { success: false, message: updateError.message }
  }

  return { success: true, cumplioSla }
}

export async function rechazarSolicitud(solicitudId: number, aprobadoPor: string) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase
    .from("solicitudes_personal")
    .update({ estado: "rechazada", aprobado_por: aprobadoPor })
    .eq("id", solicitudId)

  if (error) return { success: false, message: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------
// Programación de turnos — vista interna de solo lectura. La crea el
// cliente desde el portal (ver lib/portal-cliente-actions.ts), que
// también dispara la fila básica en nomina_generada.
// ---------------------------------------------------------------------

// Llamada por lib/portal-cliente-actions.ts justo después de que el
// cliente programa un turno (esa tabla la puede insertar el anon key vía
// RLS, pero nomina_generada está cerrada a service role — ver 01_fundacion).
export async function generarNominaBasicaDesdeTurno(turnoId: number) {
  const supabase = await getSupabaseAdminServimos()

  const { data: turno, error } = await supabase
    .from("programacion_turnos")
    .select("personal_mision_id, fecha, hora_inicio, hora_fin")
    .eq("id", turnoId)
    .single()

  if (error || !turno) return { success: false, message: "Turno no encontrado" }

  const { data: personal } = await supabase
    .from("personal_mision")
    .select("tarifa_hora")
    .eq("id", turno.personal_mision_id)
    .single()

  const horas = calcularHorasTurno(turno.hora_inicio, turno.hora_fin)
  const tarifaHora = Number(personal?.tarifa_hora) || 0

  const { error: nominaError } = await supabase.from("nomina_generada").insert({
    personal_mision_id: turno.personal_mision_id,
    origen: "turno",
    origen_id: turnoId,
    fecha: turno.fecha,
    concepto: "Turno ordinario",
    horas,
    valor: tarifaHora * horas,
    es_calculo_basico: true,
  })

  if (nominaError) {
    console.error("[servimos] Error creating nomina desde turno:", nominaError)
    return { success: false, message: nominaError.message }
  }
  return { success: true }
}

function calcularHorasTurno(horaInicio: string, horaFin: string): number {
  const [hIni, mIni] = horaInicio.split(":").map(Number)
  const [hFin, mFin] = horaFin.split(":").map(Number)
  let minutos = hFin * 60 + mFin - (hIni * 60 + mIni)
  if (minutos < 0) minutos += 24 * 60 // turno que cruza medianoche
  return Math.round((minutos / 60) * 100) / 100
}

export async function getProgramacionTurnos(fecha?: string) {
  const supabase = await getSupabaseAdminServimos()
  let query = supabase
    .from("programacion_turnos")
    .select("*, personal_mision(nombre, identificacion), empresas_cliente(nombre)")
    .order("fecha", { ascending: false })
  if (fecha) query = query.eq("fecha", fecha)

  const { data, error } = await query
  if (error) {
    console.error("[servimos] Error fetching programacion:", error)
    return []
  }
  return data
}

// ---------------------------------------------------------------------
// Horas extra — el supervisor las asigna desde el portal-cliente; aquí
// solo la aprobación/rechazo del Jefe de Área (uso interno, aunque en
// la fase siguiente esto también podría moverse al portal-cliente si el
// Jefe de Área tiene su propio rol allá).
// ---------------------------------------------------------------------

export async function getHorasExtra(estado?: string) {
  const supabase = await getSupabaseAdminServimos()
  let query = supabase
    .from("horas_extra")
    .select("*, personal_mision(nombre, identificacion), empresas_cliente(nombre)")
    .order("created_at", { ascending: false })
  if (estado) query = query.eq("estado", estado)

  const { data, error } = await query
  if (error) {
    console.error("[servimos] Error fetching horas extra:", error)
    return []
  }
  return data
}

export async function aprobarHorasExtra(horasExtraId: number, aprobadoPor: string) {
  const supabase = await getSupabaseAdminServimos()

  const { data: horaExtra, error: fetchError } = await supabase
    .from("horas_extra")
    .select("personal_mision_id, fecha, horas")
    .eq("id", horasExtraId)
    .single()

  if (fetchError || !horaExtra) {
    return { success: false, message: "Registro de hora extra no encontrado" }
  }

  const { error: updateError } = await supabase
    .from("horas_extra")
    .update({
      estado: "aprobada",
      aprobado_jefe_area_por: aprobadoPor,
      aprobado_jefe_area_fecha: new Date().toISOString(),
    })
    .eq("id", horasExtraId)

  if (updateError) {
    console.error("[servimos] Error approving horas extra:", updateError)
    return { success: false, message: updateError.message }
  }

  // Cálculo básico (horas × tarifa_hora); el motor legal completo llega
  // en la fase siguiente.
  const { data: personal } = await supabase
    .from("personal_mision")
    .select("tarifa_hora")
    .eq("id", horaExtra.personal_mision_id)
    .single()

  const tarifaHora = Number(personal?.tarifa_hora) || 0
  const { error: nominaError } = await supabase.from("nomina_generada").insert({
    personal_mision_id: horaExtra.personal_mision_id,
    origen: "hora_extra",
    origen_id: horasExtraId,
    fecha: horaExtra.fecha,
    concepto: "Horas extra",
    horas: horaExtra.horas,
    valor: tarifaHora * Number(horaExtra.horas) * 1.25, // recargo básico placeholder; el motor legal completo reemplaza esto
    es_calculo_basico: true,
  })

  if (nominaError) {
    console.error("[servimos] Error creating nomina desde hora extra:", nominaError)
  }

  return { success: true }
}

export async function rechazarHorasExtra(horasExtraId: number, aprobadoPor: string) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase
    .from("horas_extra")
    .update({
      estado: "rechazada",
      aprobado_jefe_area_por: aprobadoPor,
      aprobado_jefe_area_fecha: new Date().toISOString(),
    })
    .eq("id", horasExtraId)

  if (error) return { success: false, message: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------
// Novedades — vista interna de solo lectura (las reporta el cliente).
// ---------------------------------------------------------------------

export async function getNovedades(empresaClienteId?: number) {
  const supabase = await getSupabaseAdminServimos()
  let query = supabase
    .from("novedades")
    .select("*, personal_mision(nombre, identificacion), empresas_cliente(nombre)")
    .order("fecha_inicio", { ascending: false })
  if (empresaClienteId) query = query.eq("empresa_cliente_id", empresaClienteId)

  const { data, error } = await query
  if (error) {
    console.error("[servimos] Error fetching novedades:", error)
    return []
  }
  return data
}

// ---------------------------------------------------------------------
// Incapacidades — revisión MANUAL del staff interno en esta fase (la
// sube el trabajador desde el portal-trabajador). `revisado_por_ia`
// queda reservado para cuando se conecte LIPbot (fase siguiente).
// ---------------------------------------------------------------------

export async function getIncapacidadesPendientes() {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase
    .from("incapacidades")
    .select("*, personal_mision(nombre, identificacion, empresa_cliente_id)")
    .eq("estado", "pendiente_revision")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[servimos] Error fetching incapacidades:", error)
    return []
  }
  return data
}

export async function aprobarIncapacidad(incapacidadId: number, revisadoPor: string) {
  const supabase = await getSupabaseAdminServimos()

  const { data: incapacidad, error: fetchError } = await supabase
    .from("incapacidades")
    .select("personal_mision_id, tipo, fecha_inicio, fecha_fin, personal_mision(empresa_cliente_id)")
    .eq("id", incapacidadId)
    .single()

  if (fetchError || !incapacidad) {
    return { success: false, message: "Incapacidad no encontrada" }
  }

  const fechaInicio = new Date(incapacidad.fecha_inicio)
  const fechaFin = new Date(incapacidad.fecha_fin)
  const dias = Math.max(1, Math.round((fechaFin.getTime() - fechaInicio.getTime()) / 86400000) + 1)
  const empresaClienteId = (incapacidad as any).personal_mision?.empresa_cliente_id ?? null

  // Genera la novedad de nómina automáticamente al aprobar.
  const { data: novedad, error: novedadError } = await supabase
    .from("novedades")
    .insert({
      personal_mision_id: incapacidad.personal_mision_id,
      empresa_cliente_id: empresaClienteId,
      codigo: incapacidad.tipo === "AT" ? "Incapacidad AT" : "Incapacidad EG",
      tipo_novedad: "Dias",
      cantidad_valor: dias,
      fecha_inicio: incapacidad.fecha_inicio,
      fecha_fin: incapacidad.fecha_fin,
      origen: "incapacidad",
    })
    .select()
    .single()

  if (novedadError || !novedad) {
    console.error("[servimos] Error creating novedad desde incapacidad:", novedadError)
    return { success: false, message: novedadError?.message ?? "Error al generar la novedad" }
  }

  const { error: updateError } = await supabase
    .from("incapacidades")
    .update({
      estado: "aprobada",
      revisado_por: revisadoPor,
      fecha_revision: new Date().toISOString(),
      novedad_id: novedad.id,
    })
    .eq("id", incapacidadId)

  if (updateError) {
    console.error("[servimos] Error updating incapacidad:", updateError)
    return { success: false, message: updateError.message }
  }

  return { success: true, novedadId: novedad.id }
}

export async function rechazarIncapacidad(incapacidadId: number, revisadoPor: string, observaciones?: string) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase
    .from("incapacidades")
    .update({
      estado: "rechazada",
      revisado_por: revisadoPor,
      fecha_revision: new Date().toISOString(),
      observaciones,
    })
    .eq("id", incapacidadId)

  if (error) return { success: false, message: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------
// Cuadro de control — KPIs del dashboard interno
// ---------------------------------------------------------------------

export async function getCuadroControlServimos() {
  const supabase = await getSupabaseAdminServimos()
  const hoy = new Date().toISOString().split("T")[0]

  const [solicitudesPendientes, solicitudesEntregadas, turnosHoy, horasExtraPendientes, incapacidadesPendientes, nominaReciente] =
    await Promise.all([
      supabase.from("solicitudes_personal").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
      supabase.from("solicitudes_personal").select("cumplio_sla").eq("estado", "entregada"),
      supabase.from("programacion_turnos").select("id", { count: "exact", head: true }).eq("fecha", hoy),
      supabase.from("horas_extra").select("id", { count: "exact", head: true }).eq("estado", "pendiente_jefe_area"),
      supabase.from("incapacidades").select("id", { count: "exact", head: true }).eq("estado", "pendiente_revision"),
      supabase.from("nomina_generada").select("valor").order("created_at", { ascending: false }).limit(200),
    ])

  const entregadas = solicitudesEntregadas.data ?? []
  const cumplidas = entregadas.filter((s) => s.cumplio_sla === true).length
  const pctCumplimientoSla = entregadas.length > 0 ? Math.round((cumplidas / entregadas.length) * 100) : null
  const valorNominaReciente = (nominaReciente.data ?? []).reduce((sum, n) => sum + (Number(n.valor) || 0), 0)

  return {
    solicitudesPendientes: solicitudesPendientes.count ?? 0,
    pctCumplimientoSla,
    turnosProgramadosHoy: turnosHoy.count ?? 0,
    horasExtraPendientes: horasExtraPendientes.count ?? 0,
    incapacidadesPendientes: incapacidadesPendientes.count ?? 0,
    valorNominaReciente,
  }
}
