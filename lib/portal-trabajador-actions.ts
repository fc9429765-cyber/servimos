"use server"

// Portal del trabajador (personal en misión) — login liviano por
// identificación, mismo patrón que app/portal/ de LIP (usuario y
// contraseña son el mismo documento), SIN Supabase Auth real. La sesión
// se guarda en localStorage en el cliente (ver
// components/portal-trabajador/portal-trabajador-provider.tsx), así que
// estas acciones usan getSupabaseAdminServimos() (service role) — no hay
// sesión de Supabase Auth que atar a un cliente con cookies.

import { getSupabaseAdminServimos } from "@/lib/supabase-admin"

export interface PortalTrabajadorLoginResult {
  success: boolean
  error?: string
  trabajador?: {
    id: number
    nombre: string
    identificacion: string
    cargo: string | null
    empresa_cliente_id: number | null
  }
}

export async function loginPortalTrabajador(identificacion: string, password: string): Promise<PortalTrabajadorLoginResult> {
  const ident = (identificacion || "").trim()
  const pass = (password || "").trim()

  if (!ident || !pass) {
    return { success: false, error: "Debes diligenciar ambos campos." }
  }
  if (ident !== pass) {
    return { success: false, error: "Las credenciales no coinciden." }
  }

  try {
    const supabase = await getSupabaseAdminServimos()
    const { data, error } = await supabase
      .from("personal_mision")
      .select("id, nombre, identificacion, cargo, empresa_cliente_id, estado")
      .eq("identificacion", ident)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[portal-trabajador] Error en login:", error)
      return { success: false, error: "No pudimos validar tu identidad." }
    }
    if (!data) {
      return { success: false, error: "No encontramos un trabajador con esa identificación." }
    }
    if (data.estado !== "Activo") {
      return { success: false, error: "Este documento no tiene una misión activa." }
    }

    return {
      success: true,
      trabajador: {
        id: data.id,
        nombre: data.nombre,
        identificacion: data.identificacion,
        cargo: data.cargo,
        empresa_cliente_id: data.empresa_cliente_id,
      },
    }
  } catch (error) {
    console.error("[portal-trabajador] Error inesperado en login:", error)
    return { success: false, error: "Error inesperado al iniciar sesión." }
  }
}

export async function getMisIncapacidades(personalMisionId: number) {
  const supabase = await getSupabaseAdminServimos()
  const { data, error } = await supabase
    .from("incapacidades")
    .select("*")
    .eq("personal_mision_id", personalMisionId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[portal-trabajador] Error fetching incapacidades:", error)
    return []
  }
  return data
}

// Llamada desde app/api/portal-trabajador/incapacidades/upload/route.ts
// después de subir el soporte a Storage.
export async function crearIncapacidad(params: {
  personalMisionId: number
  tipo: "EG" | "AT"
  fechaInicio: string
  fechaFin: string
  archivoUrl: string
}) {
  const supabase = await getSupabaseAdminServimos()
  const { error } = await supabase.from("incapacidades").insert({
    personal_mision_id: params.personalMisionId,
    tipo: params.tipo,
    fecha_inicio: params.fechaInicio,
    fecha_fin: params.fechaFin,
    archivo_url: params.archivoUrl,
  })

  if (error) {
    console.error("[portal-trabajador] Error creando incapacidad:", error)
    return { success: false, message: error.message }
  }
  return { success: true }
}
