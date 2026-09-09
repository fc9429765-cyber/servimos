"use server"

import { getSupabaseAdminServimos } from "@/lib/supabase-admin"

// Permisos de módulos Servimos (servimos.permisos_usuarios), separados de
// public.permisos_usuarios. `getUserPermissions()` en permissions-actions.ts
// fusiona el resultado de esta función con los permisos de LIP para que
// sidebar.tsx / permission-guard.tsx no tengan que saber que hay dos fuentes.
export async function getUserPermissionsServimos(userId: string) {
  try {
    const supabase = await getSupabaseAdminServimos()

    const { data, error } = await supabase
      .from("permisos_usuarios")
      .select("servimos_solicitudes, servimos_programacion, servimos_horas_extra, servimos_novedades, servimos_cuadro_control, servimos_inicio")
      .eq("usuario_id", userId)
      .single()

    if (error || !data) return null

    return data
  } catch (error) {
    console.error("Error in getUserPermissionsServimos:", error)
    return null
  }
}

export async function updateUserPermissionsServimos(
  userId: string,
  permissions: Partial<{
    servimos_solicitudes: boolean
    servimos_programacion: boolean
    servimos_horas_extra: boolean
    servimos_novedades: boolean
    servimos_cuadro_control: boolean
    servimos_inicio: boolean
  }>,
) {
  try {
    const supabase = await getSupabaseAdminServimos()

    const { data: existing } = await supabase
      .from("permisos_usuarios")
      .select("id")
      .eq("usuario_id", userId)
      .single()

    if (existing) {
      const { error } = await supabase.from("permisos_usuarios").update(permissions).eq("usuario_id", userId)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase.from("permisos_usuarios").insert({ usuario_id: userId, ...permissions })
      if (error) return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in updateUserPermissionsServimos:", error)
    return { success: false, error: String(error) }
  }
}
