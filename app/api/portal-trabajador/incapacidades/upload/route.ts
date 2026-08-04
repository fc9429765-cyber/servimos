import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminServimos } from "@/lib/supabase-admin"
import { crearIncapacidad } from "@/lib/portal-trabajador-actions"

// Sube el soporte de una incapacidad del portal-trabajador a Supabase
// Storage (bucket "archivos", compartido con LIP — .storage no depende
// del esquema Postgres del cliente) y guarda la fila en
// servimos.incapacidades con estado "pendiente_revision".
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const personalMisionId = Number((formData.get("personal_mision_id") as string) || "")
    const tipo = ((formData.get("tipo") as string) || "EG") as "EG" | "AT"
    const fechaInicio = (formData.get("fecha_inicio") as string) || ""
    const fechaFin = (formData.get("fecha_fin") as string) || ""

    if (!personalMisionId || !fechaInicio || !fechaFin) {
      return NextResponse.json({ error: "Faltan datos de la incapacidad" }, { status: 400 })
    }

    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "Adjunta el soporte de la incapacidad" }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdminServimos()
    const safeName = file.name.replace(/[^\w.\-]+/g, "_")
    const filePath = `servimos-incapacidades/${personalMisionId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabaseAdmin.storage.from("archivos").upload(filePath, file)
    if (uploadError) {
      console.error("[portal-trabajador] Error subiendo incapacidad a Storage:", uploadError)
      return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from("archivos").getPublicUrl(filePath)

    const result = await crearIncapacidad({
      personalMisionId,
      tipo,
      fechaInicio,
      fechaFin,
      archivoUrl: urlData.publicUrl,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[portal-trabajador] Error en POST incapacidades/upload:", error)
    return NextResponse.json({ error: error?.message || "Error al cargar la incapacidad" }, { status: 500 })
  }
}
