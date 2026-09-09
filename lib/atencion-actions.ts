"use server"

import { getSupabaseAdminServimos } from "@/lib/supabase-admin"
import { getUserPermissions } from "@/lib/permissions-actions"
import { MODULE_PERMISSION_MAP } from "@/lib/permissions-map"

// Ítem de "atención del día" que la IA prioriza. Datos REALES por empresa.
export interface AtencionRow {
  label: string
  sev: "crit" | "warn" | "info"
  /** Módulo a abrir al tocar la alerta (nombre exacto del módulo). */
  modulo?: string
}

function colombiaHour(): number {
  const now = new Date()
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" })).getHours()
}

/**
 * Calcula lo que "requiere atención hoy" (Servimos). Defensivo: cualquier
 * fallo devuelve lista vacía y la tarjeta de IA simplemente no muestra el
 * bloque.
 *
 * Fase 2 (2026-08-05): reescrito contra el esquema de nómina nuevo —
 * `servimos.solicitudes_personal`/`incapacidades`/`horas_extra` de Fase 1
 * ya no existen. Incapacidades y horas extra ahora son filas de
 * `servimos.novedades` (tipo IEG/IAT y HED/HEN respectivamente).
 */
export async function getAtencionDelDia(userId?: string): Promise<{ success: boolean; items: AtencionRow[] }> {
  try {
    const supabase = await getSupabaseAdminServimos()

    const items: AtencionRow[] = []

    // 1) Incapacidades (IEG/IAT) pendientes de revisión.
    const { count: incapPendientes } = await supabase
      .from("novedades")
      .select("id", { count: "exact", head: true })
      .in("tipo", ["IEG", "IAT"])
      .eq("estado", "pendiente")
    if (incapPendientes && incapPendientes > 0) {
      items.push({
        label: `${incapPendientes} incapacidad${incapPendientes !== 1 ? "es" : ""} pendiente${incapPendientes !== 1 ? "s" : ""} de revisión`,
        sev: "warn",
        modulo: "Novedades de Personal en Misión",
      })
    }

    // 2) Horas extra (HED/HEN) reportadas como novedad, pendientes de aprobación.
    const { count: horasExtraPend } = await supabase
      .from("novedades")
      .select("id", { count: "exact", head: true })
      .in("tipo", ["HED", "HEN"])
      .eq("estado", "pendiente")
    if (horasExtraPend && horasExtraPend > 0) {
      items.push({
        label: `${horasExtraPend} hora${horasExtraPend !== 1 ? "s" : ""} extra pendiente${horasExtraPend !== 1 ? "s" : ""} de aprobación`,
        sev: "warn",
        modulo: "Novedades de Personal en Misión",
      })
    }

    // GATE por área: cada tarea pertenece a un módulo/KPI de un área. Se
    // muestra SOLO a quien tiene el permiso de ese módulo, para que LIPbot
    // no exhiba tareas ajenas al rol. Si no hay registro de permisos (p. ej.
    // gerencia/admin), no se oculta.
    let permisos: any = null
    try {
      permisos = await getUserPermissions(userId)
    } catch {
      permisos = null
    }
    const permitido = (it: AtencionRow): boolean => {
      if (!it.modulo) return true
      const key = MODULE_PERMISSION_MAP[it.modulo]
      if (!key) return true
      if (!permisos) return true
      return !!permisos[key]
    }
    const visibles = items.filter(permitido)

    // "Vida propia" de la IA: si hay pendientes y ya es tarde (>= 3pm Colombia),
    // escala una alerta de CUMPLIMIENTO al frente — no se están atendiendo a
    // tiempo. Así el asistente insiste en el cierre del día.
    if (visibles.length > 0 && colombiaHour() >= 15) {
      visibles.unshift({
        label: "⚠ Cumplimiento: atiende los pendientes antes del cierre del día",
        sev: "crit",
      })
    }

    return { success: true, items: visibles }
  } catch (e) {
    console.error("[atencion] error:", e)
    return { success: false, items: [] }
  }
}
